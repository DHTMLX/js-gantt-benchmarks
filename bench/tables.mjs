// Generates published markdown tables from a machine's measured results.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  LIBS, SIZES, SHAPES, METRICS, MODES, REFERENCE_MACHINE, PRACTICAL_EQUIVALENCE_PCT,
} from "./config.mjs";
import { datasetComposition } from "../shared/dataset.js";
import { machineIdFromArgv } from "./argv.mjs";
import { machineTitle } from "./machine.mjs";
import { cellKey, deriveOutcomes, skippedByCascade, STATES } from "./outcomes.mjs";
import { readMachine } from "./results.mjs";
import { resolveVersion } from "./versions.mjs";

const sizeLabel = (n) => (n >= 10000 ? `${n / 1000}k` : String(n));

// Spaced thousands used in reader-facing output.
const spaced = (n) => n.toLocaleString("en-US").replace(/,/g, " ");

// Short footnote markers keep columns narrow. Exported because a renderer telling a marker
// from a figure needs the same list.
export const MARKERS = {
  dnf: "DNF",
  unsettled: "no-settle",
  noAutoScheduling: "***",
  error: "error",
  environment: "env",
  skipped: "skip",
  noScroll: "no-scroll",
  unreached: "unreached",
  mixed: "mixed",
  missing: "—",
  partial: "(n/N)",
};

// Runner note prefixes and their table markers.
const NOTE_MARKERS = [
  ["DNF", MARKERS.dnf],
  ["did not settle", MARKERS.unsettled],
  ["n/a", MARKERS.noAutoScheduling],
  ["skipped", MARKERS.skipped],
  ["environment", MARKERS.environment],
  ["error", MARKERS.error],
  ["fps unavailable", MARKERS.noScroll],
  ["mixed", MARKERS.mixed],
];

/** The marker a note stands for, or null for a note that names no known outcome. */
export const markerForNote = (note) =>
  NOTE_MARKERS.find(([prefix]) => String(note ?? "").startsWith(prefix))?.[1] ?? null;

// A stopping marker names one step; the steps behind it carry `unreached` or `skip` instead.
const STOPPED_THE_ROW =
  "Marks the step it happened at, and no other: the steps after it were never attempted at " +
  "this size.";

const LEGEND = {
  [MARKERS.dnf]: `Test execution was aborted due to timeout exceeded. ${STOPPED_THE_ROW}`,
  [MARKERS.unsettled]:
    "The chart never went quiet within the time limit, so no figure was recorded. " +
    "Reported as a failure rather than as the value of the time limit, which would " +
    `have said nothing about the library. ${STOPPED_THE_ROW}`,
  [MARKERS.noAutoScheduling]: "Library does not provide auto-scheduling logic.",
  [MARKERS.error]: `Test execution was aborted due to an in-page error. ${STOPPED_THE_ROW}`,
  [MARKERS.environment]:
    "The harness could not reach its own server here, so nothing about the library was " +
    "measured. Not a result — a measurement to re-run.",
  [MARKERS.skipped]:
    "Not attempted. Every run at a smaller dataset in this mode and shape failed at this " +
    "step, and each step is measured on the chart the ones before it left — so the step " +
    "and everything after it are skipped at every larger size, while the steps before it " +
    "were measured and their figures are in this row. The list below the tables names the " +
    "step and the size each skip was inferred from.",
  [MARKERS.noScroll]:
    "The scroll moved nothing — no scrollable pane was found, or the chart was already at " +
    "the bottom — so the frames counted would have been idle ones rather than rendering. No " +
    "FPS figure is published here; the steps after it were measured as usual.",
  [MARKERS.unreached]:
    "Never attempted. Every test of a run shares one chart in a fixed order — load, scroll, " +
    "move, bulk edit — and at this size the run stopped at a step before this one, which " +
    "carries the marker that says why. Not a measurement of this test.",
  [MARKERS.mixed]:
    "The runs behind this figure failed for different reasons — an in-page error in one and " +
    "a timeout in another, say — so no single outcome describes it. Each run's own note is " +
    "in `runs.csv`.",
  [MARKERS.missing]: "Not measured in this run.",
  [MARKERS.partial]:
    "Printed beside a figure whose median came from n of the N runs of that test, the rest " +
    "having failed at it or never reached it. The `samples` column in `results.csv` carries " +
    "the same counts, and every individual run is in `runs.csv`.",
};

/**
 * The `metric=n/N` counts a row carries for the metrics measured by only some of its runs,
 * as `{ fps: "1/3" }`. Empty for a cell where every metric got every run.
 */
export function partialSamples(row) {
  return Object.fromEntries(
    String(row?.samples ?? "")
      .split(" ")
      .filter(Boolean)
      .map((part) => part.split("="))
  );
}

// The marker each derived step outcome publishes. A measured step has a figure, not a marker.
const STATE_MARKERS = {
  [STATES.dnf]: MARKERS.dnf,
  [STATES.error]: MARKERS.error,
  [STATES.unsettled]: MARKERS.unsettled,
  [STATES.noScroll]: MARKERS.noScroll,
  [STATES.environment]: MARKERS.environment,
  [STATES.noAutoScheduling]: MARKERS.noAutoScheduling,
  [STATES.skipped]: MARKERS.skipped,
  [STATES.unreached]: MARKERS.unreached,
  [STATES.mixed]: MARKERS.mixed,
};

/**
 * Preserve measured values; a metric with no figure reports what happened to the step that
 * measures it, so a step the run never reached is not printed as another step's failure.
 *
 * A note this generator cannot place is read as it was written rather than dropped.
 */
export function cellValue(row, metric, outcomes) {
  if (!row) return MARKERS.missing;

  const value = row[metric.key];
  if (value !== "" && value != null) return value;

  const { state } = outcomes.get(cellKey(row))?.steps?.[metric.step] ?? {};
  return STATE_MARKERS[state] ?? markerForNote(row.note) ?? MARKERS.missing;
}

export const findRow = (rows, libId, shape, size, mode) =>
  rows.find(
    (r) =>
      r.lib === libId &&
      r.shape === shape &&
      Number(r.size) === size &&
      r.autoScheduling === String(mode)
  );

export function renderMarkdownTable(header, body) {
  const widths = header.map((h, i) =>
    Math.max(h.length, ...body.map((r) => String(r[i]).length))
  );
  const line = (cells) =>
    `| ${cells.map((c, i) => String(c).padEnd(widths[i])).join(" | ")} |`;

  return [
    line(header),
    `|${widths.map((w) => "-".repeat(w + 2)).join("|")}|`,
    ...body.map(line),
  ].join("\n");
}

/**
 * Everything a table needs about one machine: its rows, the version each library was measured
 * at, what happened to each step, and the set collecting the markers the tables published.
 */
export function tableView(machine) {
  return {
    rows: machine.metricRows,
    versions: versionsFrom(machine.metricRows),
    outcomes: deriveOutcomes(machine),
    used: new Set(),
  };
}

// One table per metric and mode; shape stays as a column for side-by-side workloads.
function renderTable(metric, mode, { rows, versions, outcomes, used }) {
  const body = LIBS.flatMap((lib) =>
    SHAPES.map((shape) => [
      `${lib.name} v${versions[lib.id] ?? "unknown"}`,
      shape.label,
      ...SIZES.map((size) => {
        const row = findRow(rows, lib.id, shape.id, size, mode);
        const value = cellValue(row, metric, outcomes);
        if (LEGEND[value]) {
          used.add(value);
          return value;
        }
        // Partial figures carry the sample count that produced them.
        const count = partialSamples(row)[metric.key];
        if (!count) return value;
        used.add(MARKERS.partial);
        return `${value} (${count})`;
      }),
    ])
  );

  return renderMarkdownTable(["Library", "Shape", ...SIZES.map(sizeLabel)], body);
}

/**
 * One test: what it measures, then each mode's charts and the table holding their figures.
 *
 * `chartsFor` supplies a mode's figures, so a report can put a chart above the table it plots
 * and the standalone tables document can leave them out.
 */
const shapesInTable = () => {
  const labels = SHAPES.map((shape) => shape.label);
  return labels.length < 2
    ? labels.join("")
    : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
};

export function renderTestBody(metric, view, chartsFor = () => []) {
  return [
    metric.description,
    "",
    ...MODES.flatMap((mode) => {
      const figures = chartsFor(metric, mode);
      return [
        `#### Auto-scheduling — ${mode ? "enabled" : "disabled"}`,
        "",
        ...(figures.length ? [...figures, ""] : []),
        `**Results table: ${metric.label} — ${shapesInTable()}, auto-scheduling ` +
          `${mode ? "on" : "off"}.**`,
        "",
        `Measured in ${metric.unit} — ${metric.better} is better.`,
        "",
        renderTable(metric, mode, view),
        "",
      ];
    }),
    ...(metric.note ? [metric.note, ""] : []),
  ].join("\n");
}

const renderTestSection = (metric, view) =>
  [`### Test: ${metric.label}`, "", renderTestBody(metric, view)].join("\n");

/** The legend for the markers the tables used, in the order a reader meets them. */
export function renderMarkerLegend(used) {
  if (!used.size) return "";

  return [
    "### What the markers in the tables mean",
    "",
    ...[...used].map((m) => `- \`${m}\` — ${LEGEND[m]}`),
  ].join("\n");
}

/**
 * The two dataset shapes and what each of them holds at every size.
 *
 * Counted by the shared generator and rendered into tables and CONFIGURATION.md.
 */
export function renderDatasetShapes() {
  const rows = SIZES.flatMap((size) =>
    SHAPES.map((shape) => {
      const { summaries, leaves, links } = datasetComposition(shape.id, size);
      return [spaced(size), shape.label, spaced(summaries), spaced(leaves), spaced(links)];
    })
  );

  return [
    "### The two dataset shapes",
    "",
    "Every metric is measured on both, at every size and in both auto-scheduling modes. Both " +
      "are generated by one function from one parameter, and both hold exactly as many " +
      "records as the size says — so at a given size the two shapes put the same number of " +
      "rows on screen.",
    "",
    ...SHAPES.flatMap((shape) => [`**${shape.label}.** ${shape.description}`, ""]),
    renderMarkdownTable(["Size", "Shape", "Summary rows", "Leaves", "Links"], rows),
    "",
    "Leaf count and link count differ between the shapes by about a tenth, which is the one " +
      "quantity that cannot be held " +
      "equal alongside equal record counts — so the two shapes are two workloads rather than " +
      "one experiment with hierarchy as its variable, and a difference between a library's " +
      "two rows is not attributable to hierarchy alone. Comparisons are between libraries " +
      "within a shape.",
    "",
  ].join("\n");
}

/** Version per library, preferring the one recorded with the measurement. */
export function versionsFrom(metricRows) {
  return Object.fromEntries(
    LIBS.map((lib) => [
      lib.id,
      // Filtered runs may lack a row; fall back to the installed version label.
      metricRows.find((r) => r.lib === lib.id)?.version || resolveVersion(lib),
    ])
  );
}

export function environmentLine(env) {
  return [
    env.cpu,
    env.ram_gb ? `RAM ${env.ram_gb} GB` : null,
    env.os,
    env.browser,
    env.refresh_hz && env.refresh_hz !== "unknown" ? `${env.refresh_hz} Hz display` : null,
  ].filter(Boolean).join(", ");
}

/**
 * How many runs per cell, across every session that contributed. results.csv carries one
 * environment block — the newest session's — so reading the count from there would state one
 * session's setting as if it applied to the whole matrix.
 */
export function runsPerCellText(env, sessions) {
  const counts = [
    ...new Set(
      (sessions.length ? sessions : [env])
        .map((s) => Number(s.runs_per_cell))
        .filter(Number.isFinite)
    ),
  ].sort((a, b) => a - b);

  if (!counts.length) return null;
  // State counts as "of the runs that produced a figure".
  const attempted =
    counts.length === 1
      ? `${counts[0]} independent fresh-browser ${counts[0] === 1 ? "run" : "runs"} of every test`
      : `${counts.join(" or ")} independent fresh-browser runs of every test, depending on the ` +
        "session that measured it (`env.json` records the count per session)";
  return (
    `Each figure is the median of the runs that produced one, out of ${attempted}; where a ` +
    "figure came from fewer, the count is printed beside it."
  );
}

/** Reader-facing environment facts shared by the report intro and standalone tables. */
export function measurementContextLines({ env, machineId, sessions = [] }) {
  const sessionIds = [...new Set(sessions.map((s) => s.session).filter(Boolean))].sort();
  const environment = environmentLine(env);

  return [
    `Machine ${machineTitle(machineId)}${environment ? ` — ${environment}.` : "."}`,
    runsPerCellText(env, sessions)
      ? `${runsPerCellText(env, sessions)} Every individual run is in \`runs.csv\`.` +
        (env.headless === "true" ? " Headless — FPS figures are not reliable." : "")
      : null,
    env.sleep_inhibited === "false"
      ? "Sleep and screen blanking were not inhibited by the harness on this machine."
      : env.sleep_inhibitor
        ? "The harness kept the machine awake for the duration of the run."
        : null,
    sessionIds.length > 1
      ? `Measured across ${sessionIds.length} sessions; the \`session\` column in ` +
        "`results.csv` identifies the source of each cell."
      : null,
  ].filter(Boolean);
}

/** Removes runner prefixes while preserving the underlying browser error. */
function publicErrorNote(note) {
  const message = String(note ?? "")
    .trim()
    .replace(/^error:\s*/i, "")
    .replace(/^page\.evaluate:\s*/i, "");

  return message === "Target crashed" ? "Browser tab crashed" : message;
}

/** The failure a group of skips was inferred from; a failed load stops the whole larger cell. */
const skipSource = ({ sourceStep, sourceSize }) =>
  sourceStep === "ttr"
    ? `could not load ${spaced(sourceSize)} tasks`
    : `${sourceStep} failed at ${spaced(sourceSize)}`;

function errorRunTally(runs, row) {
  const ofCell = runs.filter(
    (r) =>
      r.lib === row.lib &&
      r.shape === row.shape &&
      String(r.size) === String(row.size) &&
      String(r.autoScheduling) === String(row.autoScheduling)
  );
  const failed = ofCell.filter((r) => /^error:/i.test(String(r.note ?? "").trim()));
  if (!ofCell.length || !failed.length) return "";
  return failed.length === ofCell.length
    ? ` in all ${ofCell.length} run${ofCell.length === 1 ? "" : "s"}`
    : ` in ${failed.length} of ${ofCell.length} runs`;
}

/**
 * What a cell cannot say for itself: the failure each skip was inferred from, and the errors
 * that arrived after a figure was already recorded. Empty for a round with neither.
 */
export function renderResultNotes({ metricRows, runs = [] }, outcomes) {
  const skipped = skippedByCascade(outcomes);
  // Preserve later errors even when an earlier metric produced a valid figure.
  const erroredButMeasured = metricRows.filter(
    (row) =>
      (row.note ?? "").startsWith("error") &&
      METRICS.some((m) => row[m.key] !== "" && row[m.key] != null)
  );

  return [
    ...(skipped.length
      ? [
          "### Steps not attempted, and the failure each was inferred from",
          "",
          "A step that failed in every run at one dataset size is not retried at larger sizes " +
            "in the same mode and shape; `METHODOLOGY.md` states the rule and why the " +
            "inference holds. The failure each skip was inferred from is named below, so no " +
            "component's skipped results rest on anything a reader cannot check in the tables " +
            "above.",
          "",
          ...skipped.map(
            (group) =>
              `- ${group.lib}, ${group.shape}, auto-scheduling ` +
              `${String(group.mode) === "true" ? "on" : "off"} — ` +
              `${group.sizes.map(spaced).join(", ")} tasks: ${skipSource(group)}`
          ),
          "",
        ]
      : []),
    ...(erroredButMeasured.length
      ? [
          "### Errors observed during measured runs",
          "",
          "These runs produced at least one valid figure before a later step raised an error. " +
            "The successful figures remain in the tables, and each error carries the number of " +
            "the cell's runs that raised it. The messages are in the `note` column of " +
            "`results.csv`, truncated there to keep the column readable.",
          "",
          ...erroredButMeasured.map(
            (row) =>
              `- ${row.lib}, ${row.shape}, ${row.size} tasks, auto-scheduling ` +
              `${row.autoScheduling === "true" ? "on" : "off"} — ` +
              `\`${publicErrorNote(row.note)}\`${errorRunTally(runs, row)}`
          ),
        ]
      : []),
  ].join("\n");
}

/** The standalone tables document: every test's tables for one machine, without charts. */
export function renderTablesMarkdown(machine) {
  const { env, machineId, sessions = [] } = machine;
  const view = tableView(machine);
  const sections = METRICS.map((metric) => renderTestSection(metric, view));
  const legend = renderMarkerLegend(view.used);
  const notes = renderResultNotes(machine, view.outcomes);

  return [
    "## Results",
    "",
    ...measurementContextLines({ env, machineId, sessions }),
    `Differences within ${PRACTICAL_EQUIVALENCE_PCT}% are treated as comparable; ` +
      "conclusions focus on substantial multiples, scaling behavior, failures, and DNFs.",
    "",
    renderDatasetShapes(),
    // The legend covers the markers the tables just used, so it is placed after rendering them.
    ...(legend ? [legend, ""] : []),
    ...sections,
    ...(notes ? [notes] : []),
    "",
  ].join("\n");
}

export function writeTables({ machineId = REFERENCE_MACHINE } = {}) {
  const machine = readMachine(machineId);
  const outPath = join(machine.dir, "tables.md");
  writeFileSync(outPath, renderTablesMarkdown(machine), "utf8");
  return outPath;
}

// CLI entry
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const machineId = machineIdFromArgv(process.argv.slice(2), REFERENCE_MACHINE);
  console.log(`Wrote ${writeTables({ machineId })}`);
}
