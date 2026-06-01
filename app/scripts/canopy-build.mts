/**
 * Canopy build and development orchestration entry point
 *
 * This wrapper delegates to @canopy-iiif/app's orchestrator so the published
 * package manages core logic. Keeping the entry small ensures the generated
 * template which consumes the published package can stay up to date.
 *
 * See https://github.com/canopy-iiif/app for more information.
 *
 * @license MIT
 * Copyright (c) 2025 Mat Jordan
 */

import {orchestrate} from "@canopy-iiif/app/orchestrator";
import * as fs from "fs";
import * as path from "path";

const err = (msg: string): void => {
  console.error(`[canopy][error] ${msg}`);
};

function deployFacets(): void {
  const src = path.resolve(".cache/iiif/facets.json");
  const destDir = path.resolve("site/api/search");
  const dest = path.join(destDir, "facets.json");
  try {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, {recursive: true});
    fs.copyFileSync(src, dest);
    console.log("[canopy] ✓ Deployed facets.json");
  } catch (e) {
    console.warn("[canopy] Could not deploy facets.json:", e);
  }
}

orchestrate().then(() => {
  deployFacets();
}).catch((error: unknown) => {
  const message =
    error &&
    typeof error === "object" &&
    "stack" in error &&
    typeof error.stack === "string"
      ? error.stack
      : error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : String(error);
  err(message);
  process.exit(1);
});

