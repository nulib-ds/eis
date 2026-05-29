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
  status: string;
}

interface ThemeDef {
  name: string;
  color: string;
  subthemes: [string, string];
}

const THEMES: ThemeDef[] = [
  { name: "Transportation Infrastructure", color: "#94a3b8", subthemes: ["Mobility Networks and Connectivity", "Infrastructure Impacts on Landscapes"] },
  { name: "Energy Systems", color: "#f59e0b", subthemes: ["Energy Extraction and Production", "Energy Distribution and Consumption"] },
  { name: "Wildlife and Natural Areas", color: "#16a34a", subthemes: ["Habitat Conservation and Biodiversity", "Human–Wildlife Interactions"] },
  { name: "Water Systems", color: "#3b82f6", subthemes: ["Water Infrastructure and Management", "Water Scarcity and Environmental Change"] },
  { name: "Urban Development", color: "#f97316", subthemes: ["Urban Expansion and Land Use Change", "Housing, Planning, and Built Environment"] },
  { name: "Industrial Production and Materials", color: "#78716c", subthemes: ["Resource Extraction and Material Flows", "Industrial Manufacturing and Pollution"] },
  { name: "Climate and Weather Modification", color: "#7dd3fc", subthemes: ["Climate Engineering and Intervention", "Adaptation to Climate Variability"] },
  { name: "Governance and Institutional Control", color: "#1d4ed8", subthemes: ["Environmental Regulation and Policy", "Institutional Power and Resource Management"] },
  { name: "Place Based Development Conflicts", color: "#b45309", subthemes: ["Community Resistance and Activism", "Land Rights and Displacement"] },
  { name: "Indigenous Narratives and Sovereignty", color: "#a21caf", subthemes: ["Indigenous Knowledge and Environmental Stewardship", "Sovereignty, Rights, and Self-Determination"] },
];

function slugFromUrl(manifestUrl: string): string {
  return manifestUrl.split("/").pop()?.replace(".json", "") ?? "";
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function EISRelatedThemes() {
  const [picks, setPicks] = useState<{ theme: ThemeDef; work: WorkEntry }[]>([]);
  const base = getBasePath();

  useEffect(() => {
    fetch(`${base}/eis-index.json`)
      .then((r) => r.json())
      .then((all: WorkEntry[]) => {
        const result: { theme: ThemeDef; work: WorkEntry }[] = [];
        for (const theme of THEMES) {
          const candidates = all.filter(
            (w) => w.thumbnail && w.themes.includes(theme.name)
          );
          if (candidates.length > 0) {
            result.push({ theme, work: pickRandom(candidates) });
          }
        }
        setPicks(result);
      })
      .catch(() => {});
  }, [base]);

  if (picks.length === 0) return null;

  return (
    <div className="eis-themes-section">
      <div className="eis-themes-grid">
        {picks.map(({ theme, work }) => {
          const slug = slugFromUrl(work.manifestUrl);
          return (
            <a
              key={theme.name}
              href={`${base}/works/${slug}.html`}
              className="eis-theme-card"
            >
              <div
                className="eis-theme-card__header"
                style={{ backgroundColor: theme.color }}
              >
                <span className="eis-theme-card__name">{theme.name}</span>
                <div className="eis-theme-card__subthemes">
                  {theme.subthemes.map((s) => (
                    <span key={s} className="eis-theme-card__sub">{s}</span>
                  ))}
                </div>
              </div>
              <div className="eis-related-card__thumb">
                <img src={work.thumbnail} alt="" loading="lazy" />
              </div>
              <p className="eis-related-card__title">{work.title}</p>
            </a>
          );
        })}
      </div>
    </div>
  );
}
