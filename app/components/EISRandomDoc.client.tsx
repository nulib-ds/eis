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
  status: string;
}

const THEME_COLORS: Record<string, string> = {
  "Transportation Infrastructure": "#94a3b8",
  "Energy Systems": "#f59e0b",
  "Wildlife and Natural Areas": "#16a34a",
  "Water Systems": "#3b82f6",
  "Urban Development": "#f97316",
  "Industrial Production and Materials": "#78716c",
  "Climate and Weather Modification": "#7dd3fc",
  "Governance and Institutional Control": "#1d4ed8",
  "Place Based Development Conflicts": "#b45309",
  "Indigenous Narratives and Sovereignty": "#a21caf",
};

function slugFromUrl(url: string): string {
  return url.split("/").pop()?.replace(".json", "") ?? "";
}

export default function EISRandomDoc() {
  const [works, setWorks] = useState<WorkEntry[]>([]);
  const [current, setCurrent] = useState<WorkEntry | null>(null);
  const [spinning, setSpinning] = useState(false);
  const base = getBasePath();

  useEffect(() => {
    fetch(`${base}/eis-index.json`)
      .then((r) => r.json())
      .then((all: WorkEntry[]) => {
        const usable = all.filter((w) => w.thumbnail);
        setWorks(usable);
        if (usable.length) {
          setCurrent(usable[Math.floor(Math.random() * usable.length)]);
        }
      })
      .catch(() => {});
  }, [base]);

  const pickRandom = useCallback(() => {
    if (works.length === 0) return;
    setSpinning(true);
    setCurrent((prev) => {
      if (works.length === 1) return works[0];
      let next = prev;
      while (next === prev) {
        next = works[Math.floor(Math.random() * works.length)];
      }
      return next;
    });
    setTimeout(() => setSpinning(false), 350);
  }, [works]);

  if (!current) return null;

  const slug = slugFromUrl(current.manifestUrl);

  return (
    <div className="eis-random">
      <a href={`${base}/works/${slug}.html`} className="eis-random__book">
        <img src={current.thumbnail} alt="" loading="lazy" />
      </a>

      <div className="eis-random__info">
        <a href={`${base}/works/${slug}.html`} className="eis-random__title">
          {current.title}
        </a>

        <div className="eis-random__tags">
          {current.year && (
            <span className="eis-random__pill eis-random__pill--year">
              {current.year}
            </span>
          )}
          {current.state && (
            <span className="eis-random__pill eis-random__pill--state">
              {current.state}
            </span>
          )}
          {current.themes?.map((t) => (
            <span
              key={t}
              className="eis-random__pill eis-random__pill--theme"
              style={{
                color: THEME_COLORS[t] ?? "#6b7280",
                borderColor: THEME_COLORS[t] ?? "#d1d5db",
              }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="eis-random__actions">
          <button
            type="button"
            className={`eis-random__btn${spinning ? " eis-random__btn--spinning" : ""}`}
            onClick={pickRandom}
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
            Surprise me
          </button>
          <a href="#explore-by-theme" className="eis-explore-jump">
            or explore by theme
            <span className="eis-explore-jump__arrow" aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
    </div>
  );
}
