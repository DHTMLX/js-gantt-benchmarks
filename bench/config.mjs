// Harness configuration; published definitions live in METHODOLOGY.md and CONFIGURATION.md.

import { readFileSync } from "node:fs";

import { DATASET_YEARS, SETTLE_CAP_MS, SIZES } from "../shared/benchConfig.js";
import { BULK_EDIT_OPS, SHAPE_IDS } from "../shared/dataset.js";
import { loadLibraries, loadRoundLibraries } from "./libraries.mjs";

// Published round identifier used in artifact paths and metadata.
export const ROUND_VERSION = "1.0.0";

// Harness version is distinct from the published round identifier.
export const HARNESS_VERSION = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
).version;

// Machine whose results feed the published report.
export const REFERENCE_MACHINE = "Apple-M1-mac";

// Smoke-test store, excluded from publication.
export const SMOKE_MACHINE_ID = "smoke";

// The round selection and complete app registry are loaded from apps.json and round-apps.json.
export const LIBS = loadRoundLibraries();

export const REGISTERED_LIBS = loadLibraries();

// Fixed bulk-edit batch size; fixtures are generated at this size in shared/dataset.js.
export { BULK_EDIT_OPS };

// Dataset shapes and their published descriptions.
export const SHAPES = [
  {
    id: "flat",
    label: "Flat chain",
    description:
      "One summary task holds every other task as a leaf directly under it, and each leaf " +
      "is linked finish-to-start to the next, so the dataset is a single dependency chain " +
      "running through all of it. With auto-scheduling on, moving one task reschedules " +
      "every task after it, and every edit rolls up through a parent with as many children " +
      "as the chart has rows. It is a stress test of both engines rather than a project " +
      "shape anyone ships.",
  },
  {
    id: "tree",
    label: "Project tree",
    description:
      "A four-level project portfolio: the portfolio root, its projects, ten work packages " +
      "per project and ten tasks per work package, which leaves about 90% of the records " +
      "leaves at every size. Fanout inside a project is constant, so the shape stays the " +
      "same from the smallest dataset to the largest and it is the number of projects that " +
      "grows. Leaves are chained inside their work package and the last leaf of one package " +
      "is linked to the first of the next in the same project, so no dependency crosses a " +
      "project boundary and a cascade is bounded by one project. Every summary is loaded " +
      "expanded, so the whole tree is on screen.",
  },
];

// Keep configured shapes aligned with the shared generator.
for (const shape of SHAPES) {
  if (!SHAPE_IDS.includes(shape.id)) {
    throw new Error(
      `SHAPES lists "${shape.id}", which shared/dataset.js cannot generate ` +
        `(it knows ${SHAPE_IDS.join(", ")})`
    );
  }
}

// The order the steps run in on one page, and the step each metric is produced by. A metric
// whose step the run never reached is reported as unreached rather than as that step's failure.
export const STEP_ORDER = ["ttr", "memory", "fps", "move", "bulk"];

// The steps a total failure cascades from. The heap sample is not one: the runner clears its
// step marker before sampling, so a failure there does not stop larger sizes.
export const CASCADE_STEPS = STEP_ORDER.filter((step) => step !== "memory");

// Metrics rendered in publication order. `unit` names the unit in prose. `axis` and the optional
// `axisUnit` title a chart’s value axis with the quantity and the unit beside it, the chart title
// having already named the metric; bench/charts.mjs adds the scale it drew on. A metric whose
// `tickFormat` puts the unit on every tick carries no `axisUnit`: the axis would repeat it.
export const METRICS = [
  {
    key: "ttr",
    step: "ttr",
    label: "Time to ready (TTR)",
    unit: "milliseconds",
    axis: "Time",
    tickFormat: "duration",
    better: "lower",
    description:
      "Loads the chart with the given number of tasks and the links between them, and " +
      "measures the time until loading, scheduling and rendering have all finished and " +
      "the chart is usable. This is time to *ready*, not time to first paint: the clock " +
      "stops when the UI goes quiet, so work a library defers to later frames is counted.",
  },
  {
    key: "ttfp",
    step: "ttr",
    label: "Time to first paint (TTFP)",
    unit: "milliseconds",
    axis: "Time",
    tickFormat: "duration",
    better: "lower",
    description:
      "The same load, measured to the first frame that has rows on screen rather than " +
      "to the last — any rows, so in the project tree the rows that stop the clock may be " +
      "summary rows. Time to ready is the primary figure because it is the point at " +
      "which the chart is usable, but it is also the measurement that most penalises " +
      "an engine for deferring work — so the figure that credits deferring is published " +
      "beside it. A library that paints early and finishes late scores well here and " +
      "badly above; one that does all its work before painting reports the same figure for " +
      "both.",
  },
  {
    key: "memory",
    step: "memory",
    label: "Memory usage",
    unit: "megabytes",
    axis: "Memory",
    axisUnit: "MB",
    better: "lower",
    description:
      "JavaScript heap still retained once the dataset is loaded, sampled after a forced " +
      "garbage collection so the figure is live data rather than uncollected garbage.",
  },
  {
    key: "fps",
    step: "fps",
    label: "Scrolling FPS",
    unit: "frames per second",
    axis: "Frames per second",
    better: "higher",
    description:
      "Scrolls the chart from the first row to the last in 100 equal steps, one per " +
      "animation frame, and counts the frames actually rendered during the scroll. Every " +
      "library is given the identical scroll — same number of steps, same fraction of the " +
      "way down per step — so the only thing that varies is how long it takes to render " +
      "it. The browser cannot draw faster than the display refreshes, so the measuring " +
      "machine's refresh rate in the environment block is a perfect score rather than a " +
      "ceiling to beat. The worst one-second stretch of each scroll is recorded as " +
      "`fpsMin` in `results.csv`.",
  },
  {
    key: "move",
    step: "move",
    label: "Moving a task",
    unit: "milliseconds",
    axis: "Time",
    tickFormat: "duration",
    better: "lower",
    description:
      "Moves a single task one month forward — the most common edit in a Gantt chart — " +
      "and measures the time until the chart has finished reacting, including every " +
      "dependent task rescheduled when auto-scheduling is enabled.",
  },
  {
    key: "bulk",
    step: "bulk",
    label: "Bulk edit",
    unit: "milliseconds",
    axis: "Time",
    tickFormat: "duration",
    better: "lower",
    description:
      `Applies ${BULK_EDIT_OPS} task updates, ${BULK_EDIT_OPS} deletions and ` +
      `${BULK_EDIT_OPS} insertions as one batch, and measures the time until the chart ` +
      "has finished reacting. This is the shape of a server sync, an imported plan or an " +
      "undone bulk operation. Every library applies the changes in place through its own " +
      "documented API, using its batching mechanism where it has one — see the note under " +
      "the tables for what that means for the components that do not.",
    note:
      "**Batching differences.** DHTMLX and Bryntum can suspend rendering " +
      "and apply the whole batch in one repaint. The other three components have no " +
      "effective equivalent: DevExtreme's `beginUpdate()`/`endUpdate()` pair defers " +
      "option changes but not the re-render inside each task call, Kendo UI exposes no " +
      "suspend mechanism at all, and Syncfusion accepts arrays for insertion and deletion " +
      "but has no bulk counterpart for updates. Applying many changes in place therefore " +
      "costs them roughly one repaint per change.\n\n" +
      "In practice an application using one of those three would replace the dataset " +
      "outright instead. Dataset replacement is not measured here. It is also not a free " +
      "substitution: it discards scroll position, selection and the contents of any open " +
      "editor, so an application doing it during a background sync has to save and restore " +
      "that state itself.",
  },
];

// Keep every metric attached to a step the runner actually has, and labelled for its charts.
for (const metric of METRICS) {
  if (!STEP_ORDER.includes(metric.step)) {
    throw new Error(
      `METRICS entry "${metric.key}" names step "${metric.step}", which is not one of ` +
        STEP_ORDER.join(", ")
    );
  }
  if (!metric.axis) {
    throw new Error(
      `METRICS entry "${metric.key}" has no axis title — bench/charts.mjs labels the value ` +
        "axis with it"
    );
  }
}

// Shared dataset sizes and date density used by runner and toolbar.
export { SIZES, DATASET_YEARS };

export const MODES = [false, true];

// Fresh-browser runs; medians use completed samples and publish their counts.
export const RUNS = 3;

// Relative gap below which positive figures are treated as equivalent.
export const PRACTICAL_EQUIVALENCE_PCT = 25;

// DNF threshold; it matches the in-page settle cap.
export const TIMEOUT_MS = SETTLE_CAP_MS;

// Grace period for the runner to receive the shim's settled:false diagnostic.
export const TIMEOUT_GRACE_MS = 15 * 1000;

// Skip later steps at larger sizes after total failure of a step; `--no-skip` disables it.
export const SKIP_LARGER_AFTER_TOTAL_FAILURE = true;

export const VIEWPORT = { width: 1600, height: 900 };

// FPS above this margin over measured refresh indicates a non-vsync run.
export const FPS_OVER_REFRESH_TOLERANCE = 1.15;

export const LAUNCH_ARGS = [
  // Enable precise heap measurements in Chromium.
  "--enable-precise-memory-info",
  "--disable-extensions",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--no-first-run",
  "--no-default-browser-check",
];
