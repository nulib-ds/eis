"use client";

import { useState, useEffect } from "react";
import { getBasePath } from "../js/getBasePath";

interface Quote {
  entity: string;
  kind: string;
  role: string;
  quote: string;
  pages: string[];
  stance?: string;
  score?: number;
}

interface WorkQuotes {
  title: string;
  stances: Record<string, Quote[]>;
  top?: Quote[];
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

function QuoteItem({ q, showChip }: { q: Quote; showChip?: boolean }) {
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
        {pageLabel(q.pages)}
      </p>
    </li>
  );
}

/** Round-1 inline, stance-grouped panel (used when the work has no `top`). */
function InlinePanel({ work }: { work: WorkQuotes }) {
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
              <QuoteItem key={i} q={q} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Standalone tabbed box with a "Top" featured view (used when `top` exists). */
function TabbedBox({ work }: { work: WorkQuotes }) {
  const tabs = [
    { key: "top", label: "Top", quotes: work.top ?? [] },
    ...STANCE_GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      quotes: work.stances?.[g.key] ?? [],
    })),
  ].filter((t) => t.quotes.length > 0);

  const [active, setActive] = useState<string>(tabs[0]?.key ?? "top");

  if (tabs.length === 0) return null;

  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  const isTop = current.key === "top";

  return (
    <div className="eis-quotes-box">
      <h2 className="eis-quotes-box__title">Notable Quotes from Stakeholders</h2>
      <p className="eis-quotes-box__hint">
        Toggle to view by stakeholder stance.
      </p>
      <div className="eis-quotes-box__tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === active}
            className={`eis-quotes-box__tab${
              t.key === active ? " eis-quotes-box__tab--active" : ""
            }${t.key !== "top" ? ` eis-quotes__group--${t.key}` : ""}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
            <span className="eis-quotes-box__count">{t.quotes.length}</span>
          </button>
        ))}
      </div>
      <ul className="eis-quotes__list">
        {current.quotes.map((q, i) => (
          <QuoteItem key={i} q={q} showChip={isTop} />
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

  // Each variant handles exactly one kind of work, so a page shows at most one.
  const hasTop = Array.isArray(work.top) && work.top.length > 0;
  if (variant === "box") {
    return hasTop ? <TabbedBox work={work} /> : null;
  }
  return hasTop ? null : <InlinePanel work={work} />;
}
