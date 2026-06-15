"use client";

import { useEffect, useState } from "react";

type CitationStyle = "APA" | "MLA" | "Chicago" | "Harvard" | "IEEE";

interface IIIFManifest {
  id: string;
  label?: Record<string, string[]>;
  metadata?: Array<{
    label: Record<string, string[]>;
    value: Record<string, string[]>;
  }>;
  homepage?: Array<{ id: string }>;
}

function getMeta(manifest: IIIFManifest, field: string): string {
  if (!manifest.metadata) return "";
  const entry = manifest.metadata.find((m) =>
    Object.values(m.label)
      .flat()
      .some((v) => v.toLowerCase() === field.toLowerCase())
  );
  if (!entry) return "";
  return Object.values(entry.value).flat().filter(Boolean).join(", ");
}

function getTitle(manifest: IIIFManifest): string {
  if (!manifest.label) return "Untitled";
  return Object.values(manifest.label).flat()[0] ?? "Untitled";
}

// Determine the authoring agency from the document's metadata. Prefer the
// catalogued Bureau (e.g. "United States. Bureau of Indian Affairs"); fall back
// to the lead entry in Key People and Groups (e.g. "Urban Mass Transportation
// Administration") before resorting to a generic label.
function getAgency(manifest: IIIFManifest): string {
  const bureau = getMeta(manifest, "Bureau").replace(/^United States\.\s*/, "");
  if (bureau) return bureau;
  const keyPeople = getMeta(manifest, "Key People and Groups").split(", ")[0];
  if (keyPeople) return keyPeople;
  return "Federal Agency";
}

function buildCitation(manifest: IIIFManifest, style: CitationStyle): string {
  const title = getTitle(manifest);
  const year = getMeta(manifest, "Year") || "n.d.";
  const location = getMeta(manifest, "Main Location");
  const url = manifest.homepage?.[0]?.id ?? manifest.id;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const agency = getAgency(manifest);

  if (style === "APA") {
    const parts = [
      `${agency}. (${year}). `,
      `*${title}*. `,
      `Environmental Impact Statements. `,
      `${url}`,
    ];
    return parts.join("");
  }

  if (style === "MLA") {
    return `${agency}. *${title}*. ${year}. *Environmental Impact Statements*, ${url}. Accessed ${today}.`;
  }

  if (style === "Chicago") {
    const place = location ? `${location}: ` : "";
    return `${agency}. *${title}*. ${place}Environmental Impact Statements, ${year}. ${url}.`;
  }

  if (style === "Harvard") {
    const place = location ? `${location}: ` : "";
    return `${agency} (${year}) *${title}*. ${place}Environmental Impact Statements. Available at: ${url} (Accessed: ${today}).`;
  }

  // IEEE
  const loc = location ? `, ${location}` : "";
  return `${agency}, "${title}," U.S. EPA${loc}, ${year}. [Online]. Available: ${url}. [Accessed: ${today}]`;
}

// Render the `*...*` italic markers used in the citation strings as real <em>
// elements. Even segments are plain text; odd segments are emphasized.
function renderCitation(text: string) {
  return text.split("*").map((seg, i) =>
    i % 2 === 1 ? <em key={i}>{seg}</em> : <span key={i}>{seg}</span>
  );
}

export default function CitationGenerator({ manifest }: { manifest: IIIFManifest }) {
  const [style, setStyle] = useState<CitationStyle>("APA");
  const [copyState, setCopyState] = useState<"idle" | "ok" | "err">("idle");
  // Canopy's client-prop serializer truncates deeply-nested values, so the
  // `manifest` prop arrives with empty metadata. Re-fetch the full manifest
  // from its id to recover the Bureau / Year / Location fields.
  const [fullManifest, setFullManifest] = useState<IIIFManifest>(manifest);

  useEffect(() => {
    let cancelled = false;
    if (manifest.metadata?.some((m) => Object.values(m.value).flat().some(Boolean))) {
      return; // prop already has real metadata; no fetch needed
    }
    fetch(manifest.id, { headers: { Accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setFullManifest(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [manifest]);

  const citation = buildCitation(fullManifest, style);

  function handleCopy() {
    const plain = citation.replace(/\*/g, "");
    navigator.clipboard
      .writeText(plain)
      .then(() => setCopyState("ok"))
      .catch(() => setCopyState("err"));
    setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
    <div className="citation-generator">
      <h3>Cite this document</h3>
      <div className="citation-tabs">
        {(["APA", "MLA", "Chicago", "Harvard", "IEEE"] as CitationStyle[]).map((s) => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            className={`citation-tab${style === s ? " citation-tab--active" : ""}`}
          >
            {s}
          </button>
        ))}
      </div>
      <p className="citation-text">{renderCitation(citation)}</p>
      <button onClick={handleCopy} className="citation-copy">
        {copyState === "ok"
          ? "Copied!"
          : copyState === "err"
            ? "Copy failed"
            : "Copy citation"}
      </button>
    </div>
  );
}
