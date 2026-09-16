// Canonical paths for round artifacts, kept independent of generators.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ROUND_VERSION } from "./config.mjs";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** A published round owns a directory: its document, its charts, and its frozen evidence. */
export const roundDir = (version = ROUND_VERSION) => join(ROOT, "reports", version);

export const reportPath = (version = ROUND_VERSION) =>
  join(roundDir(version), `report-v${version}.md`);

export const chartsDir = (version = ROUND_VERSION) => join(roundDir(version), "charts");

export const summaryPath = (version = ROUND_VERSION) => join(roundDir(version), "summary.json");

export const roundEvidenceDir = (version = ROUND_VERSION) =>
  join(roundDir(version), "raw-results");
