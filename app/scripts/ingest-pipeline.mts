/**
 * ingest-pipeline.mts
 *
 * Reusable importer for the stakeholder-extraction pipeline output that lives in
 * the GitHub repo `gracegormley-gkg/spring_pipeline`. For each document listed
 * in DOCS below it:
 *
 *   1. lists `…/output/people/<docId>/` and downloads every `NNN_*.json`
 *      (one file per stakeholder) using the user's authenticated `gh` CLI,
 *   2. normalizes each entry into the extraction shape that
 *      `build-eis-quotes.mts` already reads, carrying through the richer fields
 *      the pipeline produces (full statement text, narrative summary, per-mention
 *      pages, verification flags, attribution mode), and
 *   3. writes one consolidated artifact to `data/extractions/<docId>.json`,
 *      keyed by the Northwestern work UUID.
 *
 * The pipeline's per-stakeholder `work_id` is a CSV id (e.g. "csv:35556036091957"),
 * NOT the Northwestern work UUID the site keys everything by, so the mapping is
 * maintained explicitly in DOCS — add one line per document to onboard it.
 *
 * Publish filter: the new schema has no `critic.verdict`. We map it from the
 * pipeline's own review signal — entries flagged `needs_human_review` become
 * HUMAN_REVIEW (dropped by the build step); the rest become PASS / PASS_WITH_NOTE
 * based on `summary_quote_verified`. This mirrors the run_summary `auto_ok` count.
 *
 * Usage:  npx tsx app/scripts/ingest-pipeline.mts
 * Requires: `gh auth status` logged in (read access to the private repo).
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const REPO = "gracegormley-gkg/spring_pipeline";
const PIPELINE_ROOT = "May25/statements_pipeline/output";
const OUTPUT_DIR = path.resolve("data/extractions");

/** Documents to ingest. Add a line per doc to onboard it. */
interface DocConfig {
  /** Pipeline doc id == the people/ subfolder name. */
  docId: string;
  /** Northwestern work UUID the site keys by. */
  workId: string;
  /** Human title (falls back to the pipeline title if omitted). */
  title?: string;
  /**
   * Whether cited page numbers reliably resolve to this work's IIIF manifest
   * canvases. Kept for documentation/onboarding; the actual page-jump gate
   * lives in app/components/eisPageJump.ts. Leave false unless verified.
   */
  pageJump: boolean;
}

const DOCS: DocConfig[] = [
  {
    docId: "p0491_35556036091957",
    workId: "f009744b-3e0c-4e53-97b5-e3262f036b8b",
    title: "Off-road vehicles on public lands, implementation of Executive Order 11644",
    pageJump: false, // 356-page pipeline source vs 129-canvas manifest — no reliable map
  },
];

// ── Pipeline (raw) entry shape ─────────────────────────────────────────────
interface PipelineMention {
  evidence_pages?: string[];
  attribution_mode?: string;
  quote?: string;
  quote_verified?: boolean;
  stance_basis?: string;
  entity_as_written?: string;
  role_as_written?: string;
}

interface PipelineEntry {
  sequence?: number;
  entity?: string;
  kind?: string;
  role?: string;
  stance?: string;
  summary?: string;
  statement?: { present?: boolean; form?: string; text?: string | null };
  needs_human_review?: boolean;
  human_review_reasons?: string[];
  evidence_pages?: string[];
  summary_quote?: string;
  summary_quote_verified?: boolean;
  attribution_mode?: string;
  n_mentions?: number;
  mentions?: PipelineMention[];
}

// ── Normalized output shape (what build-eis-quotes.mts reads) ───────────────
interface NormalizedMention {
  quote: string;
  pages: string[];
  attribution_mode: string;
  quote_verified: boolean;
  stance_basis: string;
}

interface NormalizedEntry {
  sequence: number;
  entity: string;
  kind: string;
  role: string;
  stance: string;
  summary_quote: string;
  evidence_pages: string[];
  critic: { verdict: string };
  // Richer fields surfaced in the UI:
  summary: string;
  statement_form: string;
  statement_text: string;
  summary_quote_verified: boolean;
  attribution_mode: string;
  needs_human_review: boolean;
  mentions: NormalizedMention[];
}

/** Run a `gh api` call and return parsed JSON. */
function ghApi(endpoint: string): unknown {
  const out = execFileSync("gh", ["api", endpoint, "--paginate"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  // --paginate may concatenate multiple JSON arrays; handle the common single case
  // and the array-concatenation case ("][" -> ",").
  const merged = out.trim().replace(/\]\s*\[/g, ",");
  return JSON.parse(merged);
}

/** Fetch and decode a single file's contents from the repo. */
function ghFile(repoPath: string): unknown {
  const res = ghApi(
    `repos/${REPO}/contents/${repoPath}`
  ) as { content?: string; encoding?: string };
  if (!res.content) throw new Error(`No content for ${repoPath}`);
  const decoded = Buffer.from(res.content, "base64").toString("utf8");
  return JSON.parse(decoded);
}

/** Map the pipeline's review signal onto the verdict the build step filters on. */
function verdictFor(entry: PipelineEntry): string {
  if (entry.needs_human_review) return "HUMAN_REVIEW";
  return entry.summary_quote_verified ? "PASS" : "PASS_WITH_NOTE";
}

function normalizeEntry(e: PipelineEntry, i: number): NormalizedEntry {
  const mentions: NormalizedMention[] = (e.mentions ?? []).map((m) => ({
    quote: (m.quote ?? "").trim(),
    pages: m.evidence_pages ?? [],
    attribution_mode: m.attribution_mode ?? "",
    quote_verified: Boolean(m.quote_verified),
    stance_basis: m.stance_basis ?? "",
  }));

  return {
    sequence: e.sequence ?? i + 1,
    entity: e.entity ?? "",
    kind: e.kind ?? "",
    role: e.role ?? "",
    stance: e.stance ?? "",
    summary_quote: (e.summary_quote ?? "").trim(),
    evidence_pages: e.evidence_pages ?? [],
    critic: { verdict: verdictFor(e) },
    summary: (e.summary ?? "").trim(),
    statement_form: e.statement?.form ?? "",
    statement_text: (e.statement?.text ?? "").trim(),
    summary_quote_verified: Boolean(e.summary_quote_verified),
    attribution_mode: e.attribution_mode ?? "",
    needs_human_review: Boolean(e.needs_human_review),
    mentions,
  };
}

function ingestDoc(doc: DocConfig): void {
  const dir = `${PIPELINE_ROOT}/people/${doc.docId}`;
  console.log(`[ingest] ${doc.docId} → listing ${dir}`);

  const listing = ghApi(`repos/${REPO}/contents/${dir}`) as Array<{
    name: string;
    type: string;
  }>;
  const files = listing
    .filter((f) => f.type === "file" && f.name.toLowerCase().endsWith(".json"))
    .map((f) => f.name)
    .sort();

  console.log(`[ingest]   ${files.length} stakeholder file(s)`);

  const entries: NormalizedEntry[] = [];
  let publishable = 0;
  let needsReview = 0;
  let pipelineTitle = doc.title ?? "";

  files.forEach((name, i) => {
    const raw = ghFile(`${dir}/${name}`) as PipelineEntry & { title?: string };
    if (raw.title && !pipelineTitle) pipelineTitle = raw.title;
    const norm = normalizeEntry(raw, i);
    entries.push(norm);
    if (norm.needs_human_review) needsReview++;
    else publishable++;
  });

  const out = {
    doc_id: doc.docId,
    work_id: doc.workId,
    source_work_id: `csv:${doc.docId.split("_").pop()}`,
    title: doc.title ?? pipelineTitle,
    page_jump: doc.pageJump,
    n_entries: entries.length,
    entries,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outFile = path.join(OUTPUT_DIR, `${doc.docId}.json`);
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + "\n", "utf8");

  console.log(
    `[ingest]   wrote ${outFile}: ${entries.length} entries ` +
      `(${publishable} publishable, ${needsReview} needs-review/dropped)`
  );
}

function main(): void {
  try {
    execFileSync("gh", ["auth", "status"], { stdio: "ignore" });
  } catch {
    console.error("[ingest] `gh` is not authenticated. Run `gh auth login` first.");
    process.exit(1);
  }

  for (const doc of DOCS) ingestDoc(doc);
  console.log(
    `[ingest] Done. Now run: npx tsx app/scripts/build-eis-quotes.mts`
  );
}

main();
