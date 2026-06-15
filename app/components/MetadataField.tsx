import React from "react";

interface IIIFManifest {
  metadata?: Array<{
    label: Record<string, string[]>;
    value: Record<string, string[]>;
  }>;
}

interface MetadataFieldProps {
  manifest: IIIFManifest;
  /** The metadata label to look up (e.g. "Main Location", "Key People") */
  field: string;
  /** Fallback label to look up when `field` has no value (e.g. Bureau → Key People) */
  fallbackField?: string;
  /** When true, render only the first value (useful for the lead agency) */
  firstOnly?: boolean;
  /** Optional heading to display above the value */
  label?: string;
  /** Optional prefix string prepended inline to the value */
  prefix?: string;
  /** Render as "inline" (no heading, just text) or "block" (with optional label heading) */
  display?: "inline" | "block";
}

function getValues(manifest: IIIFManifest, field: string): string[] {
  if (!manifest.metadata) return [];
  const entry = manifest.metadata.find((m) =>
    Object.values(m.label)
      .flat()
      .some((v) => v.toLowerCase() === field.toLowerCase())
  );
  if (!entry) return [];
  return Object.values(entry.value).flat().filter(Boolean);
}

export default function MetadataField({
  manifest,
  field,
  fallbackField,
  firstOnly,
  label,
  prefix,
  display = "block",
}: MetadataFieldProps) {
  let values = getValues(manifest, field);
  if (values.length === 0 && fallbackField) {
    values = getValues(manifest, fallbackField);
  }
  if (firstOnly) values = values.slice(0, 1);
  if (values.length === 0) return null;

  if (display === "inline") {
    const value = values.join(", ");
    const lower = value.toLowerCase();
    const colorClass =
      lower === "yes" || lower === "complete" ? "canopy-badge--complete" :
      lower === "no" || lower === "never started" || lower === "not started" || lower === "unknown" ? "canopy-badge--not-started" :
      lower === "incomplete" ? "canopy-badge--incomplete" :
      undefined;
    return (
      <span>
        {prefix && <span>{prefix}</span>}
        {colorClass ? <span className={`canopy-badge ${colorClass}`}>{value}</span> : value}
      </span>
    );
  }

  return (
    <div className="canopy-metadata-field">
      {label && <h3>{label}</h3>}
      {values.length === 1 ? (
        <p>{values[0]}</p>
      ) : (
        <ul>
          {values.map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
