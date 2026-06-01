import React from "react";

interface IIIFManifest {
  requiredStatement?: {
    label?: Record<string, string[]>;
    value?: Record<string, string[]>;
  };
}

const FALLBACK =
  "Materials published by the U.S. Government Printing Office are in the public domain and, as such, not subject to copyright restriction. However, the Libraries request users to cite the URL and Northwestern University Libraries if they wish to reproduce images from this site.";

export default function AttributionStatement({ manifest }: { manifest: IIIFManifest }) {
  const value = manifest.requiredStatement?.value
    ? Object.values(manifest.requiredStatement.value).flat().filter(Boolean)
    : [];

  const text = value.length > 0 ? value[0] : FALLBACK;

  return (
    <dl>
      <div role="group" data-label="attribution">
        <dt>Attribution</dt>
        <dd>{text}</dd>
      </div>
    </dl>
  );
}
