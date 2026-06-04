"use client";

import { useState, useEffect, useCallback } from "react";
import { getBasePath } from "../js/getBasePath";

interface WorkEntry {
  title: string;
  thumbnail: string;
  year: string;
  state: string;
  themes: string[];
  manifestUrl: string;
  href?: string;
  status: string;
}

interface ThemeDef {
  name: string;
  color: string;
}

const THEMES: ThemeDef[] = [
  { name: "Transportation Infrastructure",        color: "#94a3b8" },
  { name: "Energy Systems",                       color: "#f59e0b" },
  { name: "Wildlife and Natural Areas",           color: "#16a34a" },
  { name: "Water Systems",                        color: "#3b82f6" },
  { name: "Urban Development",                    color: "#f97316" },
  { name: "Industrial Production and Materials",  color: "#78716c" },
  { name: "Climate and Weather Modification",     color: "#7dd3fc" },
  { name: "Governance and Institutional Control", color: "#1d4ed8" },
  { name: "Place Based Development Conflicts",    color: "#b45309" },
  { name: "Indigenous Narratives and Sovereignty",color: "#a21caf" },
];

const SLIDER_MAX = 6;
const SLIDER_DEFAULT = 1;

function slugFromUrl(url: string): string {
  return url.split("/").pop()?.replace(".json", "") ?? "";
}

function buildPicks(
  all: WorkEntry[],
  checked: Set<string>,
  sliders: Record<string, number>
): { work: WorkEntry; theme: ThemeDef }[] {
  const n = checked.size;
  if (n === 0 || all.length === 0) return [];
  const result: { work: WorkEntry; theme: ThemeDef }[] = [];
  for (const theme of THEMES) {
    if (!checked.has(theme.name)) continue;
    const count = n <= 3 ? (sliders[theme.name] ?? SLIDER_DEFAULT) : 1;
    const candidates = all.filter(
      (w) => w.thumbnail && w.themes.includes(theme.name)
    );
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      result.push({ work: shuffled[i], theme });
    }
  }
  return result;
}

// Keep existing slider values where possible; add default for newly checked themes
function mergeSliders(
  prev: Record<string, number>,
  checked: Set<string>
): Record<string, number> {
  const n = checked.size;
  if (n < 1 || n > 3) return {};
  const s: Record<string, number> = {};
  checked.forEach((name) => {
    s[name] = prev[name] ?? SLIDER_DEFAULT;
  });
  return s;
}

export default function EISRelatedThemes() {
  const [allWorks, setAllWorks]         = useState<WorkEntry[]>([]);
  const [picks, setPicks]               = useState<{ work: WorkEntry; theme: ThemeDef }[]>([]);
  const [checkedThemes, setCheckedThemes] = useState<Set<string>>(
    new Set(THEMES.map((t) => t.name))
  );
  const [sliders, setSliders]           = useState<Record<string, number>>({});
  const [filterOpen, setFilterOpen]     = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const base = getBasePath();

  const selectedCount = checkedThemes.size;
  const showSliders   = selectedCount >= 1 && selectedCount <= 3;

  // Load index
  useEffect(() => {
    fetch(`${base}/eis-index.json`)
      .then((r) => r.json())
      .then((all: WorkEntry[]) => {
        const initialChecked = new Set(THEMES.map((t) => t.name));
        setAllWorks(all);
        setPicks(buildPicks(all, initialChecked, {}));
      })
      .catch(() => {});
  }, [base]);

  // Toggle a theme checkbox
  const toggleTheme = useCallback(
    (name: string) => {
      setCheckedThemes((prev) => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        // Preserve existing slider values; only add defaults for new themes
        setSliders((prevSliders) => {
          const newSliders = mergeSliders(prevSliders, next);
          setPicks(buildPicks(allWorks, next, newSliders));
          return newSliders;
        });
        return next;
      });
    },
    [allWorks]
  );

  // Slider value change
  const changeSlider = useCallback(
    (name: string, val: number) => {
      setSliders((prev) => {
        const next = { ...prev, [name]: val };
        setPicks(buildPicks(allWorks, checkedThemes, next));
        return next;
      });
    },
    [allWorks, checkedThemes]
  );

  // Select all / clear all
  const selectAll = useCallback(() => {
    const next = new Set(THEMES.map((t) => t.name));
    setCheckedThemes(next);
    setSliders({});
    setPicks(buildPicks(allWorks, next, {}));
  }, [allWorks]);

  const clearAll = useCallback(() => {
    setCheckedThemes(new Set());
    setSliders({});
    setPicks([]);
  }, []);

  // Refresh
  const handleRefresh = useCallback(() => {
    if (!allWorks.length || picks.length === 0) return;
    setRefreshing(true);
    setTimeout(() => {
      setPicks(buildPicks(allWorks, checkedThemes, sliders));
      setRefreshing(false);
    }, 350);
  }, [allWorks, checkedThemes, sliders, picks.length]);

  if (allWorks.length === 0) return null;

  return (
    <div className="eis-themes-section">

      {/* ── Header row ── */}
      <div className="eis-themes-header">
        <p className="eis-themes-description">
          Each card links directly to that work. To browse random documents from
          specific themes, click <strong>Filter</strong>. Hit <strong>Refresh</strong> to
          discover a new set.
        </p>
        <div className="eis-themes-controls">
          <button
            className={`eis-themes-btn${filterOpen ? " eis-themes-btn--active" : ""}`}
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
          >
            {/* Funnel icon */}
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 01.707 1.707L13 10.414V16a1 1 0 01-.553.894l-4-2A1 1 0 018 14v-3.586L3.293 5.707A1 1 0 013 5z"
                clipRule="evenodd"
              />
            </svg>
            Filter
            {selectedCount < THEMES.length && selectedCount > 0 && (
              <span className="eis-themes-btn__badge">{selectedCount}</span>
            )}
          </button>

          <button
            className={`eis-themes-btn${refreshing ? " eis-themes-btn--spinning" : ""}`}
            onClick={handleRefresh}
            disabled={refreshing || picks.length === 0}
            aria-label="Shuffle documents"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 4a7 7 0 0 1 12 3.5" />
              <path d="M16 16a7 7 0 0 1-12-3.5" />
              <polyline points="1 4 4 4 4 7" />
              <polyline points="19 16 16 16 16 13" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Filter panel ── */}
      {filterOpen && (
        <div className="eis-filter-panel">
          <div className="eis-filter-panel__top">
            <span className="eis-filter-panel__heading">Filter by theme</span>
            <div className="eis-filter-panel__actions">
              <button className="eis-filter-link" onClick={selectAll}>
                Select all
              </button>
              <span aria-hidden="true" className="eis-filter-sep">·</span>
              <button className="eis-filter-link" onClick={clearAll}>
                Clear
              </button>
            </div>
          </div>

          <div className="eis-filter-panel__checkboxes">
            {THEMES.map((theme) => (
              <label key={theme.name} className="eis-filter-check">
                <input
                  type="checkbox"
                  checked={checkedThemes.has(theme.name)}
                  onChange={() => toggleTheme(theme.name)}
                />
                <span
                  className="eis-filter-check__dot"
                  style={{ backgroundColor: theme.color }}
                />
                <span className="eis-filter-check__label">{theme.name}</span>
              </label>
            ))}
          </div>

          {/* Per-theme sliders — visible when 1–3 themes checked */}
          {showSliders && (
            <div className="eis-filter-sliders">
              <p className="eis-filter-sliders__hint">
                Drag to set how many documents to show per theme.
              </p>
              {THEMES.filter((t) => checkedThemes.has(t.name)).map((theme) => {
                const val = sliders[theme.name] ?? SLIDER_DEFAULT;
                const max = SLIDER_MAX;
                return (
                  <div key={theme.name} className="eis-filter-slider">
                    <div className="eis-filter-slider__header">
                      <span
                        className="eis-filter-slider__dot"
                        style={{ backgroundColor: theme.color }}
                      />
                      <span className="eis-filter-slider__name">{theme.name}</span>
                      <span className="eis-filter-slider__val">{val} doc{val !== 1 ? "s" : ""}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={max}
                      value={val}
                      onChange={(e) => changeSlider(theme.name, Number(e.target.value))}
                      className="eis-filter-slider__input"
                      style={{ "--thumb-color": theme.color } as React.CSSProperties}
                    />
                    <div className="eis-filter-slider__ticks">
                      <span>1</span>
                      <span>{max}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedCount > 3 && (
            <p className="eis-filter-panel__note">
              Showing 1 document per theme · {picks.length} total
            </p>
          )}
        </div>
      )}

      {/* ── Document grid ── */}
      {picks.length === 0 ? (
        <p className="eis-themes-empty">
          No themes selected. Choose at least one above.
        </p>
      ) : (
        <div className="eis-themes-grid">
          {picks.map(({ work, theme }, idx) => {
            const slug = slugFromUrl(work.manifestUrl);
            const href = work.href
              ? `${base}${work.href}`
              : `${base}/works/${slug}.html`;
            return (
              <a
                key={`${work.manifestUrl}-${idx}`}
                href={href}
                className="eis-doc-card"
              >
                <div className="eis-doc-card__thumb">
                  <img src={work.thumbnail} alt="" loading="lazy" />
                </div>
                <div
                  className="eis-doc-card__stripe"
                  style={{ backgroundColor: theme.color }}
                />
                <div className="eis-doc-card__body">
                  <span
                    className="eis-doc-card__theme"
                    style={{ color: theme.color }}
                  >
                    {theme.name}
                  </span>
                  <div className="eis-doc-card__pills">
                    {work.year && (
                      <span className="eis-doc-card__pill eis-doc-card__pill--year">
                        {work.year}
                      </span>
                    )}
                    {work.state && (
                      <span className="eis-doc-card__pill eis-doc-card__pill--state">
                        {work.state}
                      </span>
                    )}
                  </div>
                  <p className="eis-doc-card__title">{work.title}</p>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
