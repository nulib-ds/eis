"use client";

import { useState, useEffect } from "react";
import { getBasePath } from "../js/getBasePath";

const STATES = [
  "Alaska","Arizona","California","Colorado","Federal / International",
  "Florida","Georgia","Hawaii","Illinois","Iowa","Maryland","Massachusetts",
  "Michigan","Minnesota","Mississippi","Missouri","Montana","Nevada",
  "New Jersey","New Mexico","New York","North Carolina","Oklahoma","Oregon",
  "Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee",
  "Texas","Washington","West Virginia","Wisconsin","Wyoming",
];

const YEARS: { label: string; slug: string }[] = [
  { label: "1970", slug: "1970" },
  { label: "1972", slug: "1972" },
  { label: "1973", slug: "1973" },
  { label: "1974", slug: "1974" },
  { label: "1975", slug: "1975" },
  { label: "1976", slug: "1976" },
  { label: "1977", slug: "1977" },
  { label: "1978", slug: "1978" },
  { label: "1980", slug: "1980" },
  { label: "1981", slug: "1981" },
];

const THEMES: { label: string; slug: string }[] = [
  { label: "Climate and Weather Modification", slug: "climate-and-weather-modification" },
  { label: "Energy Systems", slug: "energy-systems" },
  { label: "Governance and Institutional Control", slug: "governance-and-institutional-control" },
  { label: "Indigenous Narratives and Sovereignty", slug: "indigenous-narratives-and-sovereignty" },
  { label: "Industrial Production and Materials", slug: "industrial-production-and-materials" },
  { label: "Place Based Development Conflicts", slug: "place-based-development-conflicts" },
  { label: "Transportation Infrastructure", slug: "transportation-infrastructure" },
  { label: "Urban Development", slug: "urban-development" },
  { label: "Water Systems", slug: "water-systems" },
  { label: "Wildlife and Natural Areas", slug: "wildlife-and-natural-areas" },
];

const AGENCIES: { label: string; slug: string }[] = [
  { label: "Army Corps of Engineers", slug: "united-states-army-corps-of-engineers" },
  { label: "Atomic Energy Commission", slug: "us-atomic-energy-commission" },
  { label: "Bureau of Indian Affairs", slug: "united-states-bureau-of-indian-affairs" },
  { label: "Bureau of Land Management", slug: "united-states-bureau-of-land-management" },
  { label: "Bureau of Outdoor Recreation", slug: "united-states-bureau-of-outdoor-recreation" },
  { label: "Bureau of Reclamation", slug: "united-states-bureau-of-reclamation" },
  { label: "Consumer Product Safety Commission", slug: "us-consumer-product-safety-commission" },
  { label: "Dept. of Housing and Urban Development", slug: "united-states-department-of-housing-and-urban-development" },
  { label: "Dept. of Labor", slug: "united-states-department-of-labor" },
  { label: "Dept. of State", slug: "united-states-department-of-state" },
  { label: "Economic Development Administration", slug: "united-states-economic-development-administration" },
  { label: "Energy Research and Development Admin.", slug: "united-states-energy-research-and-development-administration" },
  { label: "Environmental Protection Agency", slug: "united-states-environmental-protection-agency" },
  { label: "Federal Aviation Administration", slug: "united-states-federal-aviation-administration" },
  { label: "Federal Highway Administration", slug: "united-states-federal-highway-administration" },
  { label: "Federal Power Commission", slug: "united-states-federal-power-commission" },
  { label: "Food and Drug Administration", slug: "united-states-food-and-drug-administration" },
  { label: "Forest Service", slug: "united-states-forest-service" },
  { label: "Interstate Commerce Commission", slug: "united-states-interstate-commerce-commission" },
  { label: "National Aeronautics and Space Administration", slug: "united-states-national-aeronautics-and-space-administration" },
  { label: "National Highway Traffic Safety Admin.", slug: "united-states-national-highway-traffic-safety-administration" },
  { label: "National Oceanic and Atmospheric Admin.", slug: "united-states-national-oceanic-and-atmospheric-administration" },
  { label: "National Park Service", slug: "united-states-national-park-service" },
  { label: "National Science Foundation", slug: "national-science-foundation-us" },
  { label: "Navy", slug: "united-states-navy" },
  { label: "Nuclear Regulatory Commission", slug: "us-nuclear-regulatory-commission" },
  { label: "Rural Electrification Administration", slug: "united-states-rural-electrification-administration" },
  { label: "Tennessee Valley Authority", slug: "tennessee-valley-authority" },
  { label: "Urban Mass Transportation Administration", slug: "united-states-urban-mass-transportation-administration" },
];

type SectionId = "state" | "year" | "theme" | "agency";

interface ActiveFilters {
  state: string | null;
  year: string[];
  theme: string[];
  agency: string[];
}

function readFiltersFromUrl(): ActiveFilters {
  if (typeof window === "undefined") return { state: null, year: [], theme: [], agency: [] };
  const params = new URLSearchParams(window.location.search);
  return {
    state: params.get("q") || null,
    year: params.get("year") ? params.get("year")!.split(",").filter(Boolean) : [],
    theme: params.get("themes") ? params.get("themes")!.split(",").filter(Boolean) : [],
    agency: params.get("bureau") ? params.get("bureau")!.split(",").filter(Boolean) : [],
  };
}

function buildUrl(filters: ActiveFilters): string {
  const base = getBasePath();
  const params = new URLSearchParams();

  if (filters.state) params.set("q", filters.state);

  const hasFacets =
    filters.year.length > 0 || filters.theme.length > 0 || filters.agency.length > 0;

  if (hasFacets) params.set("type", "work");
  if (filters.year.length > 0) params.set("year", filters.year.join(","));
  if (filters.theme.length > 0) params.set("themes", filters.theme.join(","));
  if (filters.agency.length > 0) params.set("bureau", filters.agency.join(","));

  const qs = params.toString();
  return qs ? `${base}/search?${qs}` : `${base}/search`;
}

function totalActiveCount(filters: ActiveFilters): number {
  return (filters.state ? 1 : 0) +
    filters.year.length +
    filters.theme.length +
    filters.agency.length;
}

export default function EISFilterBar() {
  const [open, setOpen] = useState<SectionId | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>({ state: null, year: [], theme: [], agency: [] });

  useEffect(() => {
    setFilters(readFiltersFromUrl());
  }, []);

  function navigateTo(nextFilters: ActiveFilters) {
    window.location.href = buildUrl(nextFilters);
  }

  function toggleState(value: string) {
    const next = { ...filters, state: filters.state === value ? null : value };
    navigateTo(next);
  }

  function toggleFacet(key: "year" | "theme" | "agency", slug: string) {
    const current = filters[key];
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    navigateTo({ ...filters, [key]: next });
  }

  function clearAll() {
    navigateTo({ state: null, year: [], theme: [], agency: [] });
  }

  const activeCount = totalActiveCount(filters);

  const sections: {
    id: SectionId;
    label: string;
    activeCount: number;
  }[] = [
    { id: "state", label: "State", activeCount: filters.state ? 1 : 0 },
    { id: "year",  label: "Year",  activeCount: filters.year.length },
    { id: "theme", label: "Theme", activeCount: filters.theme.length },
    { id: "agency", label: "Agency", activeCount: filters.agency.length },
  ];

  function renderPanel() {
    if (!open) return null;

    if (open === "state") {
      return STATES.map((v) => (
        <button
          key={v}
          className={[
            "eis-filter-pill",
            filters.state === v ? "eis-filter-pill--active" : "",
          ].filter(Boolean).join(" ")}
          onClick={() => toggleState(v)}
        >
          {v}
        </button>
      ));
    }

    const facetMap: Record<"year" | "theme" | "agency", { label: string; slug: string }[]> = {
      year: YEARS,
      theme: THEMES,
      agency: AGENCIES,
    };

    if (open === "year" || open === "theme" || open === "agency") {
      const items = facetMap[open];
      const active = filters[open];
      return items.map(({ label, slug }) => (
        <button
          key={slug}
          className={[
            "eis-filter-pill",
            active.includes(slug) ? "eis-filter-pill--active" : "",
          ].filter(Boolean).join(" ")}
          onClick={() => toggleFacet(open, slug)}
        >
          {label}
        </button>
      ));
    }

    return null;
  }

  return (
    <div className="eis-filter-bar">
      <div className="eis-filter-bar__tabs">
        <span className="eis-filter-bar__label">Filter by</span>
        {sections.map((s) => (
          <button
            key={s.id}
            className={[
              "eis-filter-tab",
              open === s.id ? "eis-filter-tab--open" : "",
              s.activeCount > 0 ? "eis-filter-tab--active" : "",
            ].filter(Boolean).join(" ")}
            onClick={() => setOpen(open === s.id ? null : s.id)}
          >
            {s.label}
            {s.activeCount > 0 && (
              <span className="eis-filter-tab__dot" />
            )}
          </button>
        ))}
        {activeCount > 0 && (
          <button className="eis-filter-clear" onClick={clearAll}>
            Clear {activeCount === 1 ? "filter" : `${activeCount} filters`}
          </button>
        )}
      </div>

      {open && (
        <div className="eis-filter-panel">
          {renderPanel()}
        </div>
      )}
    </div>
  );
}
