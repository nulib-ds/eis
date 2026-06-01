"use client";

import { useState } from "react";

type CitationStyle = "APA" | "Chicago" | "IEEE";

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

function buildCitation(manifest: IIIFManifest, style: CitationStyle): string {
  const title = getTitle(manifest);
  const year = getMeta(manifest, "Year") || "n.d.";
  const bureau = getMeta(manifest, "Bureau");
  const location = getMeta(manifest, "Main Location");
  const url = manifest.homepage?.[0]?.id ?? manifest.id;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const agency = bureau || "Federal Agency";

  if (style === "APA") {
    const parts = [
      `${agency}. (${year}). `,
      `*${title}*. `,
      `U.S. Environmental Protection Agency. `,
      `${url}`,
    ];
    return parts.join("");
  }

  if (style === "Chicago") {
    const place = location ? `${location}: ` : "";
    return `${agency}. *${title}*. ${place}${agency}, ${year}. ${url}.`;
  }

  // IEEE
  const loc = location ? `, ${location}` : "";
  return `${agency}, "${title}," U.S. EPA${loc}, ${year}. [Online]. Available: ${url}. [Accessed: ${today}]`;
}

export default function CitationGenerator({ manifest }: { manifest: IIIFManifest }) {
  const [style, setStyle] = useState<CitationStyle>("APA");
  const [copied, setCopied] = useState(false);

  const citation = buildCitation(manifest, style);

  function handleCopy() {
    navigator.clipboard.writeText(citation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="citation-generator">
      <h3>Cite this document</h3>
      <div className="citation-tabs">
        {(["APA", "Chicago", "IEEE"] as CitationStyle[]).map((s) => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            className={`citation-tab${style === s ? " citation-tab--active" : ""}`}
          >
            {s}
          </button>
        ))}
      </div>
      <p className="citation-text">{citation}</p>
      <button onClick={handleCopy} className="citation-copy">
        {copied ? "Copied!" : "Copy citation"}
      </button>
    </div>
  );
}
