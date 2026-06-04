/**
 * build-eis-quotes.mts
 *
 * Data-prep step (run manually, NOT part of `npm run build`).
 *
 * Reads stakeholder-extraction artifacts from `data/extractions/*.json` (the
 * output of the extract-then-critic pipeline) and produces a single
 * `assets/eis-quotes.json` keyed by `work_id`, grouped by stance.
 *
 * Only entries whose critic verdict is PASS or PASS_WITH_NOTE are published —
 * those are the ones whose quote was confirmed verbatim on the cited page.
 *
 * Docs listed in EMOTION_DOCS additionally get a deterministic emotion ranking:
 * each stance array is sorted most-emotional-first and a per-work `top` array
 * (highest-scoring quotes across all stances) is emitted. Other docs keep the
 * plain document-order behavior with no `top`.
 *
 * Usage:  npx tsx app/scripts/build-eis-quotes.mts
 */

import * as fs from "fs";
import * as path from "path";

const INPUT_DIR = path.resolve("data/extractions");
const OUTPUT_FILE = path.resolve("assets/eis-quotes.json");

/** Verdicts we trust enough to publish. */
const ACCEPTED_VERDICTS = new Set(["PASS", "PASS_WITH_NOTE"]);

/** Stance keys in the order we want them displayed. */
const STANCE_ORDER = ["in_favor", "conditional", "neutral", "opposed"] as const;
type Stance = (typeof STANCE_ORDER)[number];

/** Work IDs that get emotion ranking + a `top` featured view. */
const EMOTION_DOCS = new Set([
  "1d9ca3fe-6260-4990-b4aa-081821da89a5", // Lake Placid 1980 Winter Olympics
  "a09ad3f4-1191-442f-8219-545f2e0a62a0", // Sundesert Nuclear Power Plant
]);

/** Number of quotes shown in the "Top" featured view. */
const TOP_N = 6;

interface ExtractionEntry {
  entity?: string;
  kind?: string;
  role?: string;
  stance?: string;
  summary_quote?: string;
  evidence_pages?: string[];
  critic?: { verdict?: string };
}

interface ExtractionFile {
  work_id?: string;
  title?: string;
  entries?: ExtractionEntry[];
}

interface Quote {
  entity: string;
  kind: string;
  role: string;
  quote: string;
  pages: string[];
  stance?: Stance;
  score?: number;
}

interface WorkQuotes {
  title: string;
  stances: Record<Stance, Quote[]>;
  top?: Quote[];
}

function emptyStances(): Record<Stance, Quote[]> {
  return { in_favor: [], conditional: [], neutral: [], opposed: [] };
}

/** Charged words that signal emotional intensity (matched as whole words). */
const CHARGED_WORDS = [
  "endanger", "endangered", "imperative", "vulnerable", "serious", "seriously",
  "severe", "severely", "danger", "dangerous", "threat", "threaten", "destroy",
  "destruction", "irreparable", "oppose", "opposed", "opposition", "discredit",
  "urge", "urgent", "essential", "absolutely", "flaw", "flaws", "damage",
  "damaging", "protect", "preserve", "must", "cannot", "concern", "concerned",
  "concerns", "degradation", "degrade", "jeopardize", "alarm", "crisis",
  "fail", "failure", "disturbing", "inadequate", "deficient", "never",
  "strongly", "strong", "support", "encourage", "encouraging", "no objection",
];

const INTENSIFIERS = [
  "very", "extremely", "totally", "completely", "most", "highly", "deeply",
  "greatly", "substantially", "significantly",
];

const FIRST_PERSON = ["we", "our", "us", "i", "my", "ourselves"];

/**
 * Deterministic emotional-intensity score for a quote. Higher = more charged.
 * Purely lexical so the build is reproducible.
 */
function scoreEmotion(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;

  // Punctuation
  score += (text.match(/!/g) || []).length * 3;
  score += (text.match(/\?/g) || []).length * 1.5;

  // Quoted-within (direct speech tends to be more vivid)
  if (/[“"][^”"]{20,}[”"]/.test(text)) score += 1;

  // Word-level signals
  const words = lower.split(/[^a-z]+/).filter(Boolean);
  const wordSet = new Set(words);
  for (const w of FIRST_PERSON) if (wordSet.has(w)) score += 1;
  for (const w of INTENSIFIERS) if (wordSet.has(w)) score += 1.5;
  for (const w of CHARGED_WORDS) {
    if (w.includes(" ")) {
      if (lower.includes(w)) score += 2;
    } else if (wordSet.has(w)) {
      score += 2;
    }
  }

  // ALL-CAPS tokens (e.g., shouted emphasis), ignore short acronyms
  const caps = text.match(/\b[A-Z]{4,}\b/g) || [];
  score += caps.length * 0.5;

  // Mild length normalization so a long bland paragraph doesn't win on volume
  const lengthPenalty = Math.max(0, words.length - 60) * 0.02;
  return Math.round((score - lengthPenalty) * 100) / 100;
}

function main(): void {
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`[eis-quotes] No input dir at ${INPUT_DIR}. Nothing to do.`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(INPUT_DIR)
    .filter((f) => f.toLowerCase().endsWith(".json"));

  if (files.length === 0) {
    console.warn(`[eis-quotes] No .json files in ${INPUT_DIR}.`);
  }

  const out: Record<string, WorkQuotes> = {};
  let kept = 0;
  let skipped = 0;

  for (const file of files) {
    const full = path.join(INPUT_DIR, file);
    let data: ExtractionFile;
    try {
      data = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (e) {
      console.warn(`[eis-quotes] Skipping unparseable ${file}: ${e}`);
      continue;
    }

    const workId = data.work_id;
    if (!workId) {
      console.warn(`[eis-quotes] ${file} has no work_id; skipping.`);
      continue;
    }

    const emotion = EMOTION_DOCS.has(workId);
    const work: WorkQuotes =
      out[workId] ?? { title: data.title ?? "", stances: emptyStances() };

    const seen = new Set<string>(); // dedupe identical quote strings per work

    for (const entry of data.entries ?? []) {
      const verdict = entry.critic?.verdict ?? "";
      if (!ACCEPTED_VERDICTS.has(verdict)) {
        skipped++;
        continue;
      }

      const stance = entry.stance as Stance;
      if (!STANCE_ORDER.includes(stance)) {
        skipped++;
        continue;
      }

      const quote = (entry.summary_quote ?? "").trim();
      if (!quote || seen.has(quote)) {
        skipped++;
        continue;
      }
      seen.add(quote);

      const q: Quote = {
        entity: entry.entity ?? "",
        kind: entry.kind ?? "",
        role: entry.role ?? "",
        quote,
        pages: entry.evidence_pages ?? [],
      };
      if (emotion) q.score = scoreEmotion(quote);

      work.stances[stance].push(q);
      kept++;
    }

    if (emotion) {
      // Sort each stance most-emotional-first (stable: keeps doc order on ties).
      for (const key of STANCE_ORDER) {
        work.stances[key].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      }
      // Build the cross-stance "Top" featured view.
      const all: Quote[] = [];
      for (const key of STANCE_ORDER) {
        for (const q of work.stances[key]) all.push({ ...q, stance: key });
      }
      all.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      work.top = all.slice(0, TOP_N);
    }

    out[workId] = work;
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out, null, 2) + "\n", "utf8");

  console.log(
    `[eis-quotes] Wrote ${OUTPUT_FILE}: ${Object.keys(out).length} work(s), ${kept} quote(s) kept, ${skipped} skipped.`
  );
}

main();
