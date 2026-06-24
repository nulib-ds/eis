"use client";

import { useEffect, useRef, useState } from "react";
import CloverViewer from "@samvera/clover-iiif/viewer";
import { pageJumpEnabled } from "./eisPageJump";

/**
 * Replaces the default Canopy viewer with a controllable Clover viewer that
 * listens for `eis-goto-page` events dispatched by the stakeholder-quote page
 * links (see EISStakeholderQuotes.client.tsx) and jumps to the cited page.
 *
 * Used only for page-jump-enabled works (see eisPageJump.ts) — those whose
 * cited page numbers reliably resolve to manifest canvas labels.
 */

interface CanvasLike {
  id: string;
  label?: Record<string, string[]>;
}

/** Build a IIIF Content State annotation targeting a specific canvas. */
function contentStateFor(canvasId: string, manifestId: string) {
  return {
    "@context": "http://iiif.io/api/presentation/3/context.json",
    id: "_eis-goto",
    type: "Annotation",
    motivation: ["contentState"],
    target: {
      id: canvasId,
      type: "Canvas",
      partOf: [{ id: manifestId, type: "Manifest" }],
    },
  };
}

export default function EISQuoteViewer({ manifestId }: { manifestId: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // label (e.g. "339") -> canvas id, built from the fetched manifest.
  const labelToCanvas = useRef<Map<string, string>>(new Map());

  const [mounted, setMounted] = useState(false);
  const [iiifContent, setIiifContent] = useState<string | object>(manifestId);
  // Changing this key remounts Clover so it re-opens at the new content state.
  const [viewerKey, setViewerKey] = useState("manifest");

  // Clover is browser-only; mount after hydration.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Map canvas labels -> canvas ids so a cited page resolves to a canvas.
  useEffect(() => {
    let cancelled = false;
    fetch(manifestId)
      .then((r) => r.json())
      .then((m: { items?: CanvasLike[] }) => {
        if (cancelled) return;
        const map = new Map<string, string>();
        for (const c of m.items ?? []) {
          const labels = Object.values(c.label ?? {}).flat();
          for (const l of labels) map.set(String(l), c.id);
        }
        labelToCanvas.current = map;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [manifestId]);

  // Listen for page-jump requests from the quote links.
  useEffect(() => {
    function onGoto(e: Event) {
      const detail = (e as CustomEvent).detail || {};
      if (!detail.workId || !pageJumpEnabled(detail.workId)) return;
      // A range like "145-195" jumps to its start page.
      const start = String(detail.page ?? "").split("-")[0].trim();
      const canvasId = labelToCanvas.current.get(start);
      if (!canvasId) return;
      setIiifContent(contentStateFor(canvasId, manifestId));
      setViewerKey(canvasId);
      wrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.addEventListener("eis-goto-page", onGoto);
    return () => window.removeEventListener("eis-goto-page", onGoto);
  }, [manifestId]);

  return (
    <div ref={wrapRef}>
      {mounted ? (
        <CloverViewer
          key={viewerKey}
          iiifContent={iiifContent as string}
          options={{
            showDownload: false,
            showIIIFBadge: false,
            showTitle: false,
            informationPanel: {
              open: false,
              renderAbout: false,
              renderToggle: false,
            },
          }}
        />
      ) : (
        <div className="canopy-viewer-placeholder" aria-hidden="true" />
      )}
    </div>
  );
}
