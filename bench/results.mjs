// Raw evidence store: one machine directory, with rows upserted by cell identity.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { LIBS, REGISTERED_LIBS, SHAPES, SMOKE_MACHINE_ID } from "./config.mjs";
import { parseCsvBlocks, toCsv } from "./csv.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const RAW_RESULTS_ROOT = join(ROOT, "raw-results");

export const machineDir = (machineId) => join(RAW_RESULTS_ROOT, machineId);

// Evidence files copied into a published snapshot; tables.md is regenerable.
export const EVIDENCE_FILES = ["results.csv", "runs.csv", "env.json"];

// Rows carry harness version, shape, and partial-sample metadata so mixed sessions remain
// auditable.
export const METRIC_COLUMNS = [
  "lib", "version", "shape", "size", "autoScheduling",
  "ttr", "ttfp", "memory", "fps", "fpsMin", "move", "bulk",
  "samples", "note", "harness", "session", "measured_at",
];

export const RUN_COLUMNS = [
  "lib", "version", "shape", "size", "autoScheduling", "run",
  "ttr", "ttfp", "memory", "fps", "fpsMin", "move", "bulk",
  "note", "harness", "session", "measured_at",
];

const cellKey = (row) => `${row.lib}|${row.shape}|${row.size}|${row.autoScheduling}`;

const libOrder = new Map(REGISTERED_LIBS.map((lib, i) => [lib.id, i]));
const shapeOrder = new Map(SHAPES.map((shape, i) => [shape.id, i]));

const bySortOrder = (a, b) =>
  (libOrder.get(a.lib) ?? 99) - (libOrder.get(b.lib) ?? 99) ||
  (shapeOrder.get(a.shape) ?? 99) - (shapeOrder.get(b.shape) ?? 99) ||
  Number(a.size) - Number(b.size) ||
  String(a.autoScheduling).localeCompare(String(b.autoScheduling)) ||
  Number(a.run ?? 0) - Number(b.run ?? 0);

const readBlocks = (path) =>
  existsSync(path) ? parseCsvBlocks(readFileSync(path, "utf8")) : [];

/**
 * The measured machines in raw-results/, in alphabetical order.
 *
 * Every command that reads the store goes through here, so the smoke store is excluded in
 * one place: a harness check would otherwise reach a published round as a machine of its own,
 * carrying the one cell it measures and the run count it measures it with.
 */
export function listMachines() {
  if (!existsSync(RAW_RESULTS_ROOT)) return [];
  return readdirSync(RAW_RESULTS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(RAW_RESULTS_ROOT, entry.name, "results.csv")))
    .map((entry) => entry.name)
    .filter((name) => name !== SMOKE_MACHINE_ID)
    .sort();
}

/**
 * Everything one machine's store holds, whichever apps a round selects. Fails loudly rather
 * than returning an empty result: every caller is producing a published document from it, and
 * a silently empty table is worse than a stopped build.
 *
 * Only `npm run check` reads this, because only it reports on the store itself.
 */
export function readStore(machineId) {
  const dir = machineDir(machineId);
  const resultsPath = join(dir, "results.csv");
  if (!existsSync(resultsPath)) {
    throw new Error(
      `no results for machine "${machineId}" — expected ${resultsPath}. ` +
        `Available: ${listMachines().join(", ") || "none"}`
    );
  }
  const [metricRows = [], envRows = []] = parseCsvBlocks(readFileSync(resultsPath, "utf8"));
  const [runs = []] = readBlocks(join(dir, "runs.csv"));
  const sessions = existsSync(join(dir, "env.json"))
    ? JSON.parse(readFileSync(join(dir, "env.json"), "utf8")).sessions ?? []
    : [];

  return { machineId, dir, metricRows, runs, env: envRows[0] ?? {}, sessions };
}

/**
 * One machine's evidence as the generators consume it: the rows of the apps this round
 * measures.
 *
 * A store legitimately holds more than a round publishes — `--lib` drives any registered app,
 * and a re-measured app sits out no round on its way back in. Those rows stay in the file and
 * out of every generated document, which is a filter here rather than a rule each generator
 * remembers.
 */
export function readMachine(machineId) {
  const machine = readStore(machineId);
  const selected = new Set(LIBS.map((lib) => lib.id));

  return {
    ...machine,
    metricRows: machine.metricRows.filter((row) => selected.has(row.lib)),
    runs: machine.runs.filter((row) => selected.has(row.lib)),
  };
}

export function newSessionId(now) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

export function openResultStore({ machineId, session, env, startedAt }) {
  const dir = machineDir(machineId);
  mkdirSync(dir, { recursive: true });

  const resultsPath = join(dir, "results.csv");
  const runsPath = join(dir, "runs.csv");
  const envPath = join(dir, "env.json");

  const [existingMedians = []] = readBlocks(resultsPath);
  const [existingRuns = []] = readBlocks(runsPath);

  const medians = new Map(existingMedians.map((row) => [cellKey(row), row]));
  // Re-running a cell replaces its runs rather than appending a second set.
  const runs = new Map();
  for (const row of existingRuns) {
    const key = cellKey(row);
    if (!runs.has(key)) runs.set(key, []);
    runs.get(key).push(row);
  }

  const sessions = existsSync(envPath)
    ? JSON.parse(readFileSync(envPath, "utf8")).sessions ?? []
    : [];
  const sessionRecord = { session, started: startedAt.toISOString(), ...env };

  const flush = () => {
    const metricRows = [...medians.values()].sort(bySortOrder);
    const runRows = [...runs.values()].flat().sort(bySortOrder);

    writeFileSync(
      resultsPath,
      // Session columns and env.json identify rows measured by earlier sessions.
      `${toCsv(METRIC_COLUMNS, metricRows)}\n\n${toCsv(Object.keys(sessionRecord), [sessionRecord])}\n`,
      "utf8"
    );
    writeFileSync(runsPath, `${toCsv(RUN_COLUMNS, runRows)}\n`, "utf8");
    writeFileSync(
      envPath,
      `${JSON.stringify(
        {
          machine: machineId,
          sessions: [...sessions.filter((s) => s.session !== session), sessionRecord],
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  };

  return {
    dir,
    resultsPath,
    runsPath,
    envPath,
    /**
     * Replaces one cell's median row and all of its individual runs, keyed by
     * (lib, shape, size, autoScheduling).
     */
    upsertCell(medianRow, cellRuns) {
      const key = cellKey(medianRow);
      medians.set(key, medianRow);
      runs.set(key, cellRuns);
      flush();
    },
    flush,
  };
}
