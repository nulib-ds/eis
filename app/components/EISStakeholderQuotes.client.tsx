"use client";

import { useState, useEffect } from "react";
import { getBasePath } from "../js/getBasePath";
import { pageJumpEnabled } from "./eisPageJump";

interface Mention {
  quote: string;
  pages: string[];
  verified: boolean;
  basis: string;
}

interface Quote {
  entity: string;
  kind: string;
  role: string;
  quote: string;
  pages: string[];
  stance?: string;
  score?: number;
  summary?: string;
  statementForm?: string;
  statementText?: string;
  verified?: boolean;
  attributionMode?: string;
  mentions?: Mention[];
}

interface WorkQuotes {
  title: string;
  stances: Record<string, Quote[]>;
  top?: Quote[];
  pageJump?: boolean;
}

/** Human label for a statement form value from the pipeline. */
const STATEMENT_FORM_LABEL: Record<string, string> = {
  letter: "Letter",
  testimony: "Testimony",
  written_comment: "Written comment",
  narrator_paraphrase: "Summarized",
  sectional: "Section",
};

/**
 * Quiet provenance text shown after the attribution line: the statement form
 * (Letter / Testimony / Summarized). Renders nothing when the form is unknown.
 */
function MetaIcons({ q }: { q: Quote }) {
  const formLabel = q.statementForm
    ? STATEMENT_FORM_LABEL[q.statementForm] ?? q.statementForm
    : "";

  if (!formLabel) return null;

  return (
    <span className="eis-quotes__meta">
      {" · "}
      {formLabel}
    </span>
  );
}

interface Manifest {
  homepage?: Array<{ id?: string }>;
}

/** Display order + human labels for stance groups. */
const STANCE_GROUPS: Array<{ key: string; label: string }> = [
  { key: "in_favor", label: "In favor" },
  { key: "conditional", label: "Conditional" },
  { key: "neutral", label: "Neutral" },
  { key: "opposed", label: "Opposed" },
];

const STANCE_LABEL: Record<string, string> = {
  in_favor: "In favor",
  conditional: "Conditional",
  neutral: "Neutral",
  opposed: "Opposed",
};

/** Northwestern homepage id looks like ".../items/<work_id>". */
function workIdFromManifest(manifest: Manifest): string {
  const homepage = manifest.homepage?.[0]?.id ?? "";
  return homepage.split("/").pop() ?? "";
}

function pageLabel(pages: string[]): string {
  if (!pages.length) return "";
  return ` (p. ${pages.join(", ")})`;
}

/**
 * Plain text label, or clickable page links for page-jump-enabled works (those
 * whose cited pages reliably resolve to manifest canvases — see eisPageJump.ts).
 */
function PageRef({
  pages,
  workId,
  jump,
}: {
  pages: string[];
  workId: string;
  jump: boolean;
}) {
  if (!pages.length) return null;

  if (!jump) {
    return <>{pageLabel(pages)}</>;
  }

  const goTo = (page: string) =>
    window.dispatchEvent(
      new CustomEvent("eis-goto-page", { detail: { workId, page } })
    );

  return (
    <>
      {" ("}
      p.{" "}
      {pages.map((page, i) => (
        <span key={i}>
          {i > 0 ? ", " : ""}
          <button
            type="button"
            className="eis-page-link"
            onClick={() => goTo(page)}
            title={`Jump to page ${page} in the viewer`}
          >
            {page}
          </button>
        </span>
      ))}
      {")"}
    </>
  );
}

function QuoteItem({
  q,
  showChip,
  workId,
  jump,
}: {
  q: Quote;
  showChip?: boolean;
  workId: string;
  jump: boolean;
}) {
  const [showStatement, setShowStatement] = useState(false);
  const formLabel = q.statementForm
    ? STATEMENT_FORM_LABEL[q.statementForm] ?? q.statementForm
    : "";

  return (
    <li className="eis-quotes__item">
      {showChip && q.stance && (
        <span
          className={`eis-quotes__stance eis-quotes__group--${q.stance}`}
        >
          {STANCE_LABEL[q.stance] ?? q.stance}
        </span>
      )}
      <blockquote className="eis-quotes__quote">{q.quote}</blockquote>
      <p className="eis-quotes__attribution">
        — {q.entity}
        {q.role ? `, ${q.role}` : ""}
        <PageRef pages={q.pages} workId={workId} jump={jump} />
        <MetaIcons q={q} />
      </p>
      {q.statementText && (
        <div className="eis-quotes__statement">
          <button
            type="button"
            className="eis-quotes__statement-toggle"
            aria-expanded={showStatement}
            onClick={() => setShowStatement((v) => !v)}
          >
            {showStatement
              ? "Hide full statement"
              : `Read full ${formLabel ? formLabel.toLowerCase() : "statement"}`}
          </button>
          {showStatement && (
            <pre className="eis-quotes__statement-text">{q.statementText}</pre>
          )}
        </div>
      )}
    </li>
  );
}

/** Round-1 inline, stance-grouped panel (used when the work has no `top`). */
function InlinePanel({
  work,
  workId,
  jump,
}: {
  work: WorkQuotes;
  workId: string;
  jump: boolean;
}) {
  const groups = STANCE_GROUPS.map((g) => ({
    ...g,
    quotes: work.stances?.[g.key] ?? [],
  })).filter((g) => g.quotes.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="canopy-metadata-field eis-quotes">
      <h3>Notable Quotes from Stakeholders</h3>
      {groups.map((g) => (
        <div
          key={g.key}
          className={`eis-quotes__group eis-quotes__group--${g.key}`}
        >
          <span className="eis-quotes__stance">{g.label}</span>
          <ul className="eis-quotes__list">
            {g.quotes.map((q, i) => (
              <QuoteItem key={i} q={q} workId={workId} jump={jump} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

interface Stakeholder {
  entity: string;
  role: string;
  kind: string;
  stance?: string;
  pages: string[];
}

/**
 * Collapse quotes into one row per distinct stakeholder, merging the pages where
 * they are mentioned (dedupe, preserve first-seen order). Pass `keyByStance` to
 * keep a body that appears under two stances as two separate rows (used by the
 * "All" tab so each row can show an accurate stance chip).
 */
function stakeholdersFrom(quotes: Quote[], keyByStance = false): Stakeholder[] {
  const byKey = new Map<string, Stakeholder>();
  for (const q of quotes) {
    const key = keyByStance
      ? `${q.entity}|${q.role}|${q.stance ?? ""}`
      : `${q.entity}|${q.role}`;
    let s = byKey.get(key);
    if (!s) {
      s = {
        entity: q.entity,
        role: q.role,
        kind: q.kind ?? "",
        stance: q.stance,
        pages: [],
      };
      byKey.set(key, s);
    }
    for (const p of q.pages) {
      if (!s.pages.includes(p)) s.pages.push(p);
    }
  }
  return [...byKey.values()];
}

/**
 * Importance tier: decision-makers (agencies/government/officials) first,
 * organizations next, individuals / public commenters last.
 */
function typeTier(kind: string): number {
  const k = kind.toLowerCase();
  if (/agency|government|official|commission|federal|state/.test(k)) return 0;
  if (/individual|person|public|citizen|resident|commenter/.test(k)) return 2;
  return 1;
}

/** Rank by type tier, then by number of pages mentioned (descending). */
function rankStakeholders(list: Stakeholder[]): Stakeholder[] {
  return list
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const t = typeTier(a.s.kind) - typeTier(b.s.kind);
      if (t !== 0) return t;
      const p = b.s.pages.length - a.s.pages.length;
      if (p !== 0) return p;
      return a.i - b.i;
    })
    .map((x) => x.s);
}

function StakeholderItem({
  s,
  showChip,
  workId,
  jump,
}: {
  s: Stakeholder;
  showChip?: boolean;
  workId: string;
  jump: boolean;
}) {
  return (
    <li className="eis-quotes__item eis-quotes__stakeholder">
      {showChip && s.stance && (
        <span className={`eis-quotes__stance eis-quotes__group--${s.stance}`}>
          {STANCE_LABEL[s.stance] ?? s.stance}
        </span>
      )}
      <p className="eis-quotes__attribution">
        <span className="eis-quotes__stakeholder-name">{s.entity}</span>
        {s.role ? `, ${s.role}` : ""}
        <PageRef pages={s.pages} workId={workId} jump={jump} />
      </p>
    </li>
  );
}

/** Standalone tabbed box with a "Top" featured view (used when `top` exists). */
function TabbedBox({
  work,
  workId,
  jump,
}: {
  work: WorkQuotes;
  workId: string;
  jump: boolean;
}) {
  const [view, setView] = useState<"quotes" | "stakeholders">("quotes");
  const [quotesTab, setQuotesTab] = useState<string>("top");
  const [stakeTab, setStakeTab] = useState<string>("all");
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const searching = term.length > 0;

  // Stance quotes don't carry a `stance` field — inject it from the group key so
  // ranking and the "All" stance chip work.
  const stanceQuotes = (key: string): Quote[] =>
    (work.stances?.[key] ?? []).map((q) => ({ ...q, stance: q.stance ?? key }));

  const presentStances = STANCE_GROUPS.filter(
    (g) => stanceQuotes(g.key).length > 0
  );

  // ── Quotes view tabs: Top + present stances ───────────────────────────────
  const quoteTabs = [
    { key: "top", label: "Top", quotes: work.top ?? [] },
    ...presentStances.map((g) => ({
      key: g.key,
      label: g.label,
      quotes: stanceQuotes(g.key),
    })),
  ].filter((t) => t.quotes.length > 0);

  // ── Stakeholders view tabs: All + present stances ─────────────────────────
  const allQuotes = presentStances.flatMap((g) => stanceQuotes(g.key));
  const stakeTabs = [
    {
      key: "all",
      label: "All",
      items: rankStakeholders(stakeholdersFrom(allQuotes, true)),
      showChip: true,
    },
    ...presentStances.map((g) => ({
      key: g.key,
      label: g.label,
      items: rankStakeholders(stakeholdersFrom(stanceQuotes(g.key))),
      showChip: false,
    })),
  ].filter((t) => t.items.length > 0);

  if (quoteTabs.length === 0 && stakeTabs.length === 0) return null;

  const isQuotes = view === "quotes";
  const tabs = isQuotes ? quoteTabs : stakeTabs;
  const active = isQuotes ? quotesTab : stakeTab;
  const setActive = isQuotes ? setQuotesTab : setStakeTab;

  // Fall back to the first available tab when the active one isn't in this view.
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  if (!current) return null;

  // Search overrides the tabs: match name + role + quote text across all stances.
  const matched = searching
    ? allQuotes.filter((q) =>
        `${q.entity} ${q.role} ${q.quote}`.toLowerCase().includes(term)
      )
    : [];
  const matchedStakeholders = searching
    ? rankStakeholders(stakeholdersFrom(matched, true))
    : [];
  const resultCount = isQuotes ? matched.length : matchedStakeholders.length;

  return (
    <div className="eis-quotes-box">
      <h2 className="eis-quotes-box__title">
        Stakeholders, Stances &amp; Notable Quotes
      </h2>
      <p className="eis-quotes-box__hint">
        Toggle between notable quotes and the stakeholders behind them.
      </p>
      <div className="eis-quotes-box__search">
        <input
          type="search"
          className="eis-quotes-box__search-input"
          placeholder="Search stakeholders by name, role, or quote"
          aria-label="Search stakeholders"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            className="eis-quotes-box__search-clear"
            aria-label="Clear search"
            onClick={() => setQuery("")}
          >
            ✕
          </button>
        )}
      </div>
      <div className="eis-quotes-box__toggle" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={isQuotes}
          className={`eis-quotes-box__toggle-btn${
            isQuotes ? " eis-quotes-box__toggle-btn--active" : ""
          }`}
          onClick={() => setView("quotes")}
        >
          Notable Quotes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isQuotes}
          className={`eis-quotes-box__toggle-btn${
            !isQuotes ? " eis-quotes-box__toggle-btn--active" : ""
          }`}
          onClick={() => setView("stakeholders")}
        >
          Stakeholders
        </button>
      </div>
      {searching ? (
        <p className="eis-quotes-box__results">
          {resultCount === 0
            ? `No stakeholders match “${query.trim()}”`
            : `${resultCount} ${
                resultCount === 1 ? "match" : "matches"
              } across all stances`}
        </p>
      ) : (
        <div className="eis-quotes-box__tabs" role="tablist">
          {tabs.map((t) => {
            const isPlain = t.key === "top" || t.key === "all";
            const count = "quotes" in t ? t.quotes.length : t.items.length;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={t.key === current.key}
                className={`eis-quotes-box__tab${
                  t.key === current.key ? " eis-quotes-box__tab--active" : ""
                }${isPlain ? "" : ` eis-quotes__group--${t.key}`}`}
                onClick={() => setActive(t.key)}
              >
                {t.label}
                <span className="eis-quotes-box__count">{count}</span>
              </button>
            );
          })}
        </div>
      )}
      <ul className="eis-quotes__list">
        {searching
          ? isQuotes
            ? matched.map((q, i) => (
                <QuoteItem key={i} q={q} showChip workId={workId} jump={jump} />
              ))
            : matchedStakeholders.map((s, i) => (
                <StakeholderItem
                  key={i}
                  s={s}
                  showChip
                  workId={workId}
                  jump={jump}
                />
              ))
          : isQuotes && "quotes" in current
          ? current.quotes.map((q, i) => (
              <QuoteItem key={i} q={q} showChip workId={workId} jump={jump} />
            ))
          : "items" in current &&
            current.items.map((s, i) => (
              <StakeholderItem key={i} s={s} showChip workId={workId} jump={jump} />
            ))}
      </ul>
    </div>
  );
}

export default function EISStakeholderQuotes({
  manifest,
  variant = "inline",
}: {
  manifest: Manifest;
  /** "inline" = stance-grouped panel; "box" = standalone tabbed box. */
  variant?: "inline" | "box";
}) {
  const [work, setWork] = useState<WorkQuotes | null>(null);
  const [loaded, setLoaded] = useState(false);
  const base = getBasePath();
  const workId = workIdFromManifest(manifest);

  useEffect(() => {
    if (!workId) {
      setLoaded(true);
      return;
    }
    fetch(`${base}/eis-quotes.json`)
      .then((r) => r.json())
      .then((all: Record<string, WorkQuotes>) => {
        setWork(all[workId] ?? null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [base, workId]);

  if (!loaded || !work) return null;

  // Clickable page jumps only where pages reliably resolve to manifest canvases.
  const jump = pageJumpEnabled(workId);

  // Each variant handles exactly one kind of work, so a page shows at most one.
  const hasTop = Array.isArray(work.top) && work.top.length > 0;
  if (variant === "box") {
    return hasTop ? <TabbedBox work={work} workId={workId} jump={jump} /> : null;
  }
  return hasTop ? null : (
    <InlinePanel work={work} workId={workId} jump={jump} />
  );
}
