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
  status: string;
}

function slugFromUrl(manifestUrl: string): string {
  return manifestUrl.split("/").pop()?.replace(".json", "") ?? "";
}

export default function EISFeaturedWorks() {
  const [works, setWorks] = useState<WorkEntry[]>([]);
  const base = getBasePath();

  useEffect(() => {
    fetch(`${base}/eis-index.json`)
      .then((r) => r.json())
      .then((all: WorkEntry[]) => {
        const complete = all.filter((w) => w.status === "Complete" && w.thumbnail);
        setWorks(complete.slice(0, 4));
      })
      .catch(() => {});
  }, [base]);

  if (works.length === 0) return null;

  return (
    <div className="eis-featured-works">
      <div className="eis-featured-works__grid">
        {works.map((w) => {
          const slug = slugFromUrl(w.manifestUrl);
          const href = w.href ? `${base}${w.href}` : `${base}/works/${slug}.html`;
          return (
            <a key={w.manifestUrl} href={href} className="eis-related-card">
              {w.thumbnail && (
                <div className="eis-related-card__thumb">
                  <img src={w.thumbnail} alt="" loading="lazy" />
                </div>
              )}
              <p className="eis-related-card__title">{w.title}</p>
            </a>
          );
        })}
      </div>
      <div className="eis-featured-works__cta">
        <a href={`${base}/search`} className="btn-browse-all">
          Browse full collection
          <span className="btn-browse-all__arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}
