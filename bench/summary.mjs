// Generates summary.json from raw results for auditing and machine-readable retrieval.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

import {
  LIBS, SIZES, METRICS, MODES, SHAPES, DATASET_YEARS, BULK_EDIT_OPS, VIEWPORT,
  ROUND_VERSION, REFERENCE_MACHINE, TIMEOUT_MS, HARNESS_VERSION,
  PRACTICAL_EQUIVALENCE_PCT,
} from "./config.mjs";
import { BUSY_FRAME_MS, QUIET_FRAMES } from "../shared/benchConfig.js";
import { datasetComposition } from "../shared/dataset.js";
import { ROW_HEIGHT, TIMELINE_BOTTOM_UNIT } from "../shared/layout.js";
import { machineName } from "./machine.mjs";
import { summaryPath } from "./paths.mjs";
import { listMachines, readMachine } from "./results.mjs";
import { roundVersionFromArgv } from "./argv.mjs";

const numberOrNull = (value) => {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const METRIC_KEYS = METRICS.map((m) => m.key);

function resultsFor(machine) {
  return machine.metricRows.map((row) => ({
    env: machine.machineId,
    lib: row.lib,
    shape: row.shape ?? null,
    size: Number(row.size),
    autoScheduling: row.autoScheduling === "true",
    ...Object.fromEntries(METRIC_KEYS.map((key) => [key, numberOrNull(row[key])])),
    fpsMin: numberOrNull(row.fpsMin),
    samples: row.samples ?? "",
    note: row.note ?? "",
    harness: row.harness || null,
    session: row.session ?? "",
  }));
}

function environmentFor(machine) {
  const env = machine.env;
  return {
    id: machine.machineId,
    name: machineName(machine.machineId),
    cpu: env.cpu ?? null,
    cores: numberOrNull(env.cores),
    ramGb: numberOrNull(env.ram_gb),
    os: env.os ?? null,
    browser: env.browser ?? null,
    refreshHz: numberOrNull(env.refresh_hz),
    headless: env.headless === "true",
    sleepInhibited: env.sleep_inhibited === "true",
    runsPerCell: numberOrNull(env.runs_per_cell),
    sessions: machine.sessions.map((s) => ({ id: s.session, started: s.started })),
  };
}

export function buildSummary({
  generated,
  version = ROUND_VERSION,
  machineIds = listMachines(),
} = {}) {
  if (!machineIds.length) {
    throw new Error("no machine directories in raw-results/ — run the benchmark first");
  }
  const machines = machineIds.map(readMachine);

  const versionOf = (libId) =>
    machines
      .flatMap((m) => m.metricRows)
      .find((row) => row.lib === libId && row.version)?.version ?? null;

  return {
    benchmark: "js-gantt-performance",
    version,
    generated,
    referenceEnvironment: REFERENCE_MACHINE,
    // Record harness provenance and settling constants used by the summary.
    harness: {
      version: HARNESS_VERSION,
      measuredWith: [
        ...new Set(
          machines.flatMap((m) => m.metricRows.map((row) => row.harness)).filter(Boolean)
        ),
      ].sort(),
      settle: {
        busyFrameMs: BUSY_FRAME_MS,
        quietFrames: QUIET_FRAMES,
        capMs: TIMEOUT_MS,
      },
    },
    interpretation: {
      practicalEquivalencePct: PRACTICAL_EQUIVALENCE_PCT,
      rule:
        `Positive values whose larger-to-smaller ratio is at most ` +
        `${1 + PRACTICAL_EQUIVALENCE_PCT / 100} are treated as comparable. ` +
        "Conclusions focus on substantial multiples, scaling behavior, failures, and DNFs.",
    },
    // Record workload shapes and generator-derived composition for row-count comparability.
    scenarios: SHAPES.map((shape) => ({
      id: shape.id,
      label: shape.label,
      description: shape.description,
      composition: SIZES.map((size) => {
        const { summaries, leaves, links } = datasetComposition(shape.id, size);
        return { size, summaries, leaves, links };
      }),
    })),
    conditions: {
      sizes: SIZES,
      datasetYears: DATASET_YEARS,
      autoSchedulingModes: MODES,
      visibleWindow: { start: "2026-03-01", end: "2026-06-01" },
      timelineBottomTier: TIMELINE_BOTTOM_UNIT,
      rowHeightPx: ROW_HEIGHT,
      viewport: VIEWPORT,
      bulkEditOpsPerKind: BULK_EDIT_OPS,
      timeoutMs: TIMEOUT_MS,
    },
    libraries: LIBS.map((lib) => ({
      id: lib.id,
      name: lib.name,
      version: versionOf(lib.id),
      delivery: lib.delivery,
      supportsAutoScheduling: lib.supportsAutoScheduling,
    })),
    environments: machines.map(environmentFor),
    metrics: METRICS.map(({ key, label, unit, better, description }) => ({
      key, label, unit, better, description,
    })),
    results: machines.flatMap(resultsFor),
  };
}

export function writeSummary({
  version = ROUND_VERSION,
  outPath = summaryPath(version),
  ...options
} = {}) {
  const summary = buildSummary({
    generated: new Date().toISOString().slice(0, 10),
    version,
    ...options,
  });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return outPath;
}

// CLI entry
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const version = roundVersionFromArgv(process.argv.slice(2), ROUND_VERSION);
  console.log(`Wrote ${writeSummary({ version })}`);
}
