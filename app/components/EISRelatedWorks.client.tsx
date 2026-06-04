"use client";

import { useState, useEffect } from "react";
import { getBasePath } from "../js/getBasePath";

interface WorkEntry {
  title: string;
  thumbnail: string;
  year: string;
  state: string;
  themes: string[];
  manifestUrl: string;
  href?: string;
}

function slugFromUrl(manifestUrl: string): string {
  return manifestUrl.split("/").pop()?.replace(".json", "") ?? "";
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function WorkCard({
  work,
  base,
  showYear,
}: {
  work: WorkEntry;
  base: string;
  showYear: boolean;
}) {
  const slug = slugFromUrl(work.manifestUrl);
  const href = work.href ? `${base}${work.href}` : `${base}/works/${slug}.html`;
  return (
    <a href={href} className="eis-related-card">
      {work.thumbnail && (
        <div className="eis-related-card__thumb">
          <img src={work.thumbnail} alt="" loading="lazy" />
        </div>
      )}
      <p className="eis-related-card__title">{work.title}</p>
      {showYear && work.year && (
        <span className="eis-related-card__year">{work.year}</span>
      )}
    </a>
  );
}

function RelatedSection({
  label,
  tag,
  pool,
  base,
  searchVal,
  showYear,
}: {
  label: string;
  tag: string;
  pool: WorkEntry[];
  base: string;
  searchVal: string;
  showYear: boolean;
}) {
  const [displayed, setDisplayed] = useState<WorkEntry[]>(() =>
    pool.slice(0, 3)
  );

  useEffect(() => {
    setDisplayed(pool.slice(0, 3));
  }, [pool]);

  if (pool.length === 0) return null;

  const canShuffle = pool.length > 3;

  function handleShuffle() {
    setDisplayed(shuffle(pool).slice(0, 3));
  }

  return (
    <div className="eis-related-section">
      <div className="eis-related-section__header">
        <span className="eis-related-section__label">{label}</span>
        <span className="eis-related-section__tag">{tag}</span>
        <div className="eis-related-section__actions">
          {canShuffle && (
            <button
              className="eis-related-section__shuffle"
              onClick={handleShuffle}
              aria-label="Show different documents"
              title="Shuffle"
            >
              ↻
            </button>
          )}
          <a
            href={`${base}/search?q=${encodeURIComponent(searchVal)}`}
            className="eis-related-section__more"
          >
            Browse all →
          </a>
        </div>
      </div>
      <div className="eis-related-section__grid">
        {displayed.map((w) => (
          <WorkCard key={w.manifestUrl} work={w} base={base} showYear={showYear} />
        ))}
      </div>
    </div>
  );
}

export default function EISRelatedWorks({
  manifestId,
}: {
  manifestId: string;
}) {
  const [sections, setSections] = useState<
    Array<{ label: string; tag: string; pool: WorkEntry[]; searchVal: string }>
  >([]);
  const [loaded, setLoaded] = useState(false);
  const base = getBasePath();

  useEffect(() => {
    fetch(`${base}/eis-index.json`)
      .then((r) => r.json())
      .then((allWorks: WorkEntry[]) => {
        const current = allWorks.find((w) => w.manifestUrl === manifestId);
        const others = allWorks.filter((w) => w.manifestUrl !== manifestId);

        const themes = current?.themes ?? [];
        const year = current?.year ?? "";
        const state = current?.state ?? "";

        const byTheme = themes.length
          ? others.filter((w) => w.themes.some((t) => themes.includes(t)))
          : [];

        const byYear = year
          ? others.filter((w) => w.year === year)
          : [];

        const byState =
          state && state !== "Federal / International"
            ? others.filter((w) => w.state === state)
            : [];

        const built = [];
        if (byTheme.length)
          built.push({
            label: "Same Theme",
            tag: themes[0],
            pool: byTheme,
            searchVal: themes[0],
          });
        if (byYear.length)
          built.push({
            label: "Same Year",
            tag: year,
            pool: byYear,
            searchVal: year,
          });
        if (byState.length)
          built.push({
            label: "Same State",
            tag: state,
            pool: byState,
            searchVal: state,
          });

        setSections(built);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [base, manifestId]);

  if (!loaded || sections.length === 0) return null;

  return (
    <div className="eis-related-works">
      {sections.map((s) => (
        <RelatedSection key={s.label} {...s} base={base} showYear={true} />
      ))}
    </div>
  );
}
