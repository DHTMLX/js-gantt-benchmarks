// Inserts generated tables into the versioned round report and snapshots its evidence.

import {
  copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { REFERENCE_MACHINE, ROUND_VERSION } from "./config.mjs";
import { reportPath, roundEvidenceDir } from "./paths.mjs";
import { machineIdFromArgv, roundVersionFromArgv } from "./argv.mjs";
import { inspectStore, renderInspection } from "./coherence.mjs";
import { EVIDENCE_FILES, listMachines, machineDir, readMachine } from "./results.mjs";
import { reportBlocks } from "./reportBlocks.mjs";
import { writeCharts } from "./charts.mjs";
import { writeSummary } from "./summary.mjs";
import { replaceBetweenMarkers } from "./markers.mjs";

/**
 * Copies the evidence the round was measured against into the round's own directory.
 *
 * A snapshot, never a merge: `raw-results/` is a living store upserted in place as cells are
 * re-measured, so a document citing it by path would cite whatever it says today, not what it
 * said when the prose was written. Covers every machine, matching summary.json, so a reader
 * diffing the round's summary against its CSVs finds all of them present.
 */
export function snapshotEvidence({ version = ROUND_VERSION } = {}) {
  writeSummary({ version });

  const machines = listMachines();
  const rawRoot = roundEvidenceDir(version);

  for (const machineId of machines) {
    const from = machineDir(machineId);
    const to = join(rawRoot, machineId);
    mkdirSync(to, { recursive: true });
    for (const file of EVIDENCE_FILES) {
      if (existsSync(join(from, file))) {
        copyFileSync(join(from, file), join(to, file));
      }
    }
  }

  if (existsSync(rawRoot)) {
    for (const entry of readdirSync(rawRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && !machines.includes(entry.name)) {
        rmSync(join(rawRoot, entry.name), { recursive: true, force: true });
      }
    }
  }

  return machines;
}

export function writeReport({ machineId = REFERENCE_MACHINE, version = ROUND_VERSION } = {}) {
  const path = reportPath(version);
  if (!existsSync(path)) {
    throw new Error(
      `${path} does not exist. The report's prose is written by hand once per round; ` +
        "this command only fills in its tables."
    );
  }

  const machine = readMachine(machineId);
  const { written } = writeCharts({ machineId, version });
  const machines = snapshotEvidence({ version });

  const inspection = inspectStore();

  let text = readFileSync(path, "utf8");
  for (const [name, body] of reportBlocks(machine, written)) {
    text = replaceBetweenMarkers(text, name, body);
  }
  writeFileSync(path, text, "utf8");
  return { path, charts: written.length, machines, inspection };
}

// CLI entry
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const machineId = machineIdFromArgv(argv, REFERENCE_MACHINE);
  const version = roundVersionFromArgv(argv, ROUND_VERSION);

  const { path, charts, machines, inspection } = writeReport({ machineId, version });

  console.log(
    `Wrote ${path}\n  ${charts} charts, evidence snapshot for ` +
      `${machines.length} machine(s): ${machines.join(", ")}`
  );

  if (inspection.notes.length) {
    console.warn(
      `\nNOTE: ${inspection.notes.length} thing(s) to read before describing this as one round's\n` +
        "  measurements:\n\n" +
        renderInspection(inspection).replace(/^/gm, "  ")
    );
  }

  console.log(
    "\nNext round, in this order: commit and tag, then `npm run prune -- --yes` to clear\n" +
      `  raw-results/ (safe now — reports/${version}/raw-results/ holds a copy), then bump\n` +
      "  ROUND_VERSION."
  );
}
