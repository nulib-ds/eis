/**
 * Single source of truth for which works support in-page "jump to cited page"
 * links (clickable page numbers that drive the Clover viewer via the
 * `eis-goto-page` event).
 *
 * A work belongs here only when its stakeholder `evidence_pages` reliably
 * resolve to canvas labels in its IIIF manifest. For documents where the
 * pipeline ran on a different/larger scan than the published manifest (so the
 * page numbers don't line up), leave it OUT — its page numbers then render as
 * plain text and never jump to the wrong page.
 *
 * NOTE: the Off-road Vehicles EIS (f009744b-3e0c-4e53-97b5-e3262f036b8b) is
 * deliberately NOT here: its pipeline source is ~356 pages while the published
 * manifest is only 129 canvases, so no reliable page→canvas mapping exists yet.
 */
export const PAGE_JUMP_WORK_IDS = new Set<string>([
  "a09ad3f4-1191-442f-8219-545f2e0a62a0", // Sundesert Nuclear Power Plant
]);

export function pageJumpEnabled(workId: string): boolean {
  return PAGE_JUMP_WORK_IDS.has(workId);
}
