// Generates standalone SVG charts from the reference machine's CSVs. One chart covers each
// metric, mode, and dataset shape; stable colors identify libraries across charts.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  LIBS, METRICS, SIZES, MODES, SHAPES, REFERENCE_MACHINE, ROUND_VERSION,
} from "./config.mjs";
import { machineIdFromArgv, roundVersionFromArgv } from "./argv.mjs";
import { machineName } from "./machine.mjs";
import { chartsDir } from "./paths.mjs";
import { readMachine } from "./results.mjs";
import { findRow } from "./tables.mjs";

// Stable per-library color slots; duplicates are rejected rather than wrapped.
const SERIES = [
  { light: "#2a78d6", dark: "#3987e5" },
  { light: "#eb6834", dark: "#d95926" },
  { light: "#1baf7a", dark: "#199e70" },
  { light: "#eda100", dark: "#c98500" },
  { light: "#e87ba4", dark: "#d55181" },
];

if (LIBS.length > SERIES.length) {
  throw new Error(
    `${LIBS.length} apps are in this round and SERIES holds ${SERIES.length} colours — ` +
      "add a hue to SERIES in bench/charts.mjs, distinguishable from the others in both modes"
  );
}

const INK = {
  surface: { light: "#fcfcfb", dark: "#1a1a19" },
  primary: { light: "#0b0b0b", dark: "#ffffff" },
  secondary: { light: "#52514e", dark: "#c3c2b7" },
  muted: { light: "#898781", dark: "#898781" },
  grid: { light: "#e1e0d9", dark: "#2c2c2a" },
  axis: { light: "#c3c2b7", dark: "#383835" },
};

// Fixed chart and plot dimensions for comparable figures. The left pad holds the rotated value
// axis title, the widest tick label, and the gap between the two; the right pad holds the same
// tick labels again, so a figure is read at the right edge without tracing a line back.
const WIDTH = 800;
const HEIGHT = 510;
const PAD = { top: 82, right: 52, bottom: 52, left: 78 };

// Baseline of the rotated value axis title, inside the tick labels at the frame edge.
const Y_TITLE_X = 20;

// Every chart plots the same x dimension, so its title is the harness constant the metric ones
// are not. Its scale note is conditional: a single measured size is placed at the middle of the
// frame rather than logarithmically.
const X_TITLE = "Number of tasks";

const plot = {
  x0: PAD.left,
  x1: WIDTH - PAD.right,
  y0: PAD.top,
  y1: HEIGHT - PAD.bottom,
};

// FPS uses a zero-based linear axis; other metrics use logarithmic scales.
const LINEAR_METRICS = new Set(["fps"]);

const sizeLabel = (n) => (n >= 10000 ? `${n / 1000}k` : String(n));

// Filenames encode metric, mode, and shape so writers and embeds agree.
const chartName = (metric, mode, shape) =>
  `${metric.key}-${mode ? "on" : "off"}-${shape.id}.svg`;

const escape = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const numberOrNull = (value) => {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const trim = (n) => String(Number(n.toFixed(2)));

const abbreviate = (n) => {
  if (n >= 1e6) return `${trim(n / 1e6)}M`;
  if (n >= 1000) return `${trim(n / 1000)}k`;
  return trim(n);
};

// Tick text a metric names in `tickFormat`, where the unit on the tick reads better than a bare
// number does. A duration axis spans four orders of magnitude, so its ticks switch to seconds
// instead of growing a "k" that leaves the reader converting.
const TICK_FORMATS = {
  duration: (n) => (n >= 1000 ? `${trim(n / 1000)}s` : `${trim(n)}ms`),
};

const tickFormatter = (metric) => {
  if (!metric.tickFormat) return abbreviate;
  const format = TICK_FORMATS[metric.tickFormat];
  if (!format) {
    throw new Error(
      `METRICS entry "${metric.key}" asks for tick format "${metric.tickFormat}", which ` +
        `bench/charts.mjs cannot write (it knows ${Object.keys(TICK_FORMATS).join(", ")})`
    );
  }
  return format;
};

// ---------------------------------------------------------------------------- scales

// Place sizes by value so growth remains visible on the logarithmic x-axis.
function xScale(sizes) {
  if (sizes.length < 2) {
    const mid = (plot.x0 + plot.x1) / 2;
    return { sizes, x: () => mid };
  }
  // The first and last points sit a marker's width inside the frame rather than straddling
  // it, so no dot is half-drawn over the y axis.
  const inset = 12;
  const from = plot.x0 + inset;
  const to = plot.x1 - inset;
  const lo = Math.log10(sizes[0]);
  const hi = Math.log10(sizes.at(-1));
  return {
    sizes,
    x: (size) => from + ((Math.log10(size) - lo) / (hi - lo)) * (to - from),
  };
}

// Choose the first tick set that gives at least three labels.
const LOG_MULTIPLES = [[1, 2, 5], [1, 1.5, 2, 3, 5, 7], [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9]];

function logTicks(d0, d1) {
  for (const multiples of LOG_MULTIPLES) {
    const ticks = [];
    for (let e = Math.floor(d0); e <= Math.ceil(d1); e++) {
      for (const m of multiples) {
        const value = m * 10 ** e;
        const at = Math.log10(value);
        if (at >= d0 && at <= d1) ticks.push(value);
      }
    }
    if (ticks.length >= 3) return ticks.sort((a, b) => a - b);
  }
  return [];
}

// Snap bounds outward to 1/2/5 ticks so every point is bracketed without wasting plot range.
function snapLogDomain(min, max) {
  for (const multiples of LOG_MULTIPLES) {
    const lattice = [];
    for (let e = Math.floor(Math.log10(min)) - 1; e <= Math.ceil(Math.log10(max)) + 1; e++) {
      for (const m of multiples) lattice.push(m * 10 ** e);
    }
    lattice.sort((a, b) => a - b);

    const lo = lattice.filter((v) => v <= min * (1 + 1e-9)).at(-1);
    const hi = lattice.find((v) => v >= max * (1 - 1e-9));
    if (lo == null || hi == null || hi <= lo) continue;

    const ticks = lattice.filter((v) => v >= lo && v <= hi);
    if (ticks.length >= 3) {
      return { d0: Math.log10(lo), d1: Math.log10(hi), ticks };
    }
  }

// Flat series receive a decade of range.
  const d0 = Math.floor(Math.log10(min));
  const d1 = Math.max(Math.ceil(Math.log10(max)), d0 + 1);
  return { d0, d1, ticks: logTicks(d0, d1) };
}

function logScale(values) {
  const { d0, d1, ticks } = snapLogDomain(Math.min(...values), Math.max(...values));

  return {
    kind: "log",
    ticks,
    valid: (v) => v > 0,
    y: (v) => plot.y1 - ((Math.log10(v) - d0) / (d1 - d0)) * (plot.y1 - plot.y0),
  };
}

const niceStep = (raw) => {
  const e = 10 ** Math.floor(Math.log10(raw));
  const n = raw / e;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * e;
};

// Rates use a meaningful zero baseline.
function linearScale(values, ceiling) {
  const max = Math.max(...values, ceiling ?? 0, 1);
  const step = niceStep(max / 6);
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Number(v.toFixed(6)));

  return {
    kind: "linear",
    ticks,
    valid: (v) => v >= 0,
    y: (v) => plot.y1 - (v / top) * (plot.y1 - plot.y0),
  };
}

// ---------------------------------------------------------------------------- legend

const LEGEND = { y: 68, swatch: 16, gap: 7, between: 24, minBetween: 12, char: 6.55 };

// Keep the legend above the plot so missing-series gaps remain visible.
function renderLegendStrip(entries) {
  const width = (entry) =>
    LEGEND.swatch + LEGEND.gap + entry.text.length * LEGEND.char;

  const content = entries.reduce((sum, entry) => sum + width(entry), 0);
  const gaps = Math.max(entries.length - 1, 1);
  const between = Math.max(
    LEGEND.minBetween,
    Math.min(LEGEND.between, (plot.x1 - plot.x0 - content) / gaps)
  );

  let x = plot.x0;
  return entries
    .map((entry) => {
      const markup =
        `  <line class="key" x1="${x.toFixed(1)}" x2="${(x + LEGEND.swatch).toFixed(1)}" y1="${LEGEND.y}" y2="${LEGEND.y}" stroke="${entry.color}"/>\n` +
        `  <circle cx="${(x + LEGEND.swatch / 2).toFixed(1)}" cy="${LEGEND.y}" r="3.5" fill="${entry.color}"/>\n` +
        `  <text class="legend" x="${(x + LEGEND.swatch + LEGEND.gap).toFixed(1)}" y="${LEGEND.y + 4}">${escape(entry.text)}</text>`;
      x += width(entry) + between;
      return markup;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------- markup

// Declare chart roles for light/dark themes and explicit theme overrides.
function styleBlock() {
  const vars = (mode) =>
    [
      ...Object.entries(INK).map(([role, v]) => `    --ink-${role}: ${v[mode]};`),
      ...SERIES.map((s, i) => `    --series-${i + 1}: ${s[mode]};`),
    ].join("\n");

  return `<style>
  svg {
${vars("light")}
  }
  @media (prefers-color-scheme: dark) {
    svg:where(:not([data-theme="light"])) {
${vars("dark")}
    }
  }
  svg[data-theme="dark"] {
${vars("dark")}
  }
  .bg { fill: var(--ink-surface); }
  .title { fill: var(--ink-primary); font: 600 15px system-ui, -apple-system, "Segoe UI", sans-serif; }
  .subtitle { fill: var(--ink-secondary); font: 400 12px system-ui, -apple-system, "Segoe UI", sans-serif; }
  .tick { fill: var(--ink-muted); font: 400 11px system-ui, -apple-system, "Segoe UI", sans-serif; font-variant-numeric: tabular-nums; }
  .axis-title { fill: var(--ink-secondary); font: 400 12px system-ui, -apple-system, "Segoe UI", sans-serif; }
  .grid { stroke: var(--ink-grid); stroke-width: 1; }
  .axis { stroke: var(--ink-axis); stroke-width: 1; }
  .series { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
  .dot { stroke: var(--ink-surface); stroke-width: 2; }
  .ceiling { stroke: var(--ink-muted); stroke-width: 1; stroke-dasharray: 5 4; }
  .ceiling-label { fill: var(--ink-muted); font: 400 11px system-ui, -apple-system, "Segoe UI", sans-serif; }
  .legend { fill: var(--ink-secondary); font: 400 12px system-ui, -apple-system, "Segoe UI", sans-serif; }
  .key { stroke-width: 2; stroke-linecap: round; }
</style>`;
}

function renderChart({ metric, mode, shape, rows, machineId, xs, scale, refreshHz }) {
  const drawn = LIBS.map((lib, index) => ({
    name: lib.name.replace(/ Gantt$/, ""),
    color: `var(--series-${index + 1})`,
    values: xs.sizes.map((size) =>
      numberOrNull(findRow(rows, lib.id, shape.id, size, mode)?.[metric.key])
    ),
  })).filter((s) => s.values.some((v) => v != null && scale.valid(v)));

  if (!drawn.length) {
    return null;
  }

  // Both edges are labelled: the rightmost points are the ones a reader most wants a figure for,
  // and a still image gives them no other way to get one.
  const formatTick = tickFormatter(metric);
  const gridlines = scale.ticks
    .map((tick) => {
      const y = scale.y(tick).toFixed(1);
      const text = formatTick(tick);
      const baseline = (scale.y(tick) + 4).toFixed(1);
      return (
        `  <line class="grid" x1="${plot.x0}" x2="${plot.x1}" y1="${y}" y2="${y}"/>\n` +
        `  <text class="tick" x="${plot.x0 - 9}" y="${baseline}" text-anchor="end">${text}</text>\n` +
        `  <text class="tick" x="${plot.x1 + 9}" y="${baseline}" text-anchor="start">${text}</text>`
      );
    })
    .join("\n");

  const xGrid = xs.sizes
    .map((size) => {
      const x = xs.x(size).toFixed(1);
      return `  <line class="grid" x1="${x}" x2="${x}" y1="${plot.y0}" y2="${plot.y1}"/>`;
    })
    .join("\n");

  const xTicks = xs.sizes
    .map(
      (size) =>
        `  <text class="tick" x="${xs.x(size).toFixed(1)}" y="${plot.y1 + 20}" text-anchor="middle">${sizeLabel(size)}</text>`
    )
    .join("\n");

// Mark measured refresh as the FPS ceiling; overshoots flag non-vsync readings.
  const hasCeiling = metric.key === "fps" && Number.isFinite(refreshHz) && refreshHz > 0;
  let ceiling = "";
  if (hasCeiling) {
    const y = scale.y(refreshHz);
    if (y > plot.y0 + 1 && y <= plot.y1) {
      ceiling =
        `  <line class="ceiling" x1="${plot.x0}" x2="${plot.x1}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>\n` +
        `  <text class="ceiling-label" x="${plot.x1 - 4}" y="${(y - 6).toFixed(1)}" text-anchor="end">${refreshHz} Hz display ceiling</text>`;
    }
  }

  const legendEntries = [];

  const series = drawn
    .map(({ name, color, values }) => {
      // Leave incomplete sizes as gaps; interpolation would invent data.
      const segments = [];
      let current = [];
      values.forEach((value, i) => {
        if (value == null || !scale.valid(value)) {
          if (current.length) segments.push(current);
          current = [];
          return;
        }
        current.push([xs.x(xs.sizes[i]), scale.y(value)]);
      });
      if (current.length) segments.push(current);

      legendEntries.push({ text: name, color });

      const paths = segments
        .filter((seg) => seg.length > 1)
        .map(
          (seg) =>
            `  <path class="series" stroke="${color}" d="M ${seg
              .map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
              .join(" L ")}"/>`
        )
        .join("\n");

      const dots = segments
        .flat()
        .map(
          ([x, y]) =>
            `  <circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${color}"/>`
        )
        .join("\n");

      return [paths, dots].filter(Boolean).join("\n");
    })
    .join("\n");

  const legend = renderLegendStrip(legendEntries);

  // Each axis names what it plots and the scale it is drawn on. The scale is the renderer's own
  // choice, so both titles read it off the scale in hand rather than a second copy in config.
  const yTitle = [metric.axisUnit, `${scale.kind} scale`].filter(Boolean).join(", ");
  const xTitle = xs.sizes.length > 1 ? `${X_TITLE} (log scale)` : X_TITLE;
  const yTitleY = ((plot.y0 + plot.y1) / 2).toFixed(1);
  const axisTitles =
    `  <text class="axis-title" x="${((plot.x0 + plot.x1) / 2).toFixed(1)}" y="${HEIGHT - 14}" text-anchor="middle">${escape(xTitle)}</text>\n` +
    `  <text class="axis-title" x="${Y_TITLE_X}" y="${yTitleY}" text-anchor="middle" transform="rotate(-90 ${Y_TITLE_X} ${yTitleY})">${escape(`${metric.axis} (${yTitle})`)}</text>`;

  // The title names the metric, shape and mode and the axis titles carry the units and scales,
  // which leaves the second line what no other mark on the chart states: the machine the figures
  // were measured on, under the name it is published by. The measured refresh joins it on an FPS
  // chart, where a reader cannot otherwise tell a perfect score from a number a library happened
  // to reach — the ceiling line that would say so is suppressed when it lands on the frame.
  const subtitle = [
    ...(hasCeiling ? [`${refreshHz} Hz display`] : []),
    machineName(machineId) ?? machineId,
  ].join(" · ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="${escape(metric.label)}, ${escape(shape.label)} dataset, auto-scheduling ${mode ? "enabled" : "disabled"}">
${styleBlock()}
  <rect class="bg" width="${WIDTH}" height="${HEIGHT}"/>
  <text class="title" x="22" y="26">${escape(metric.label)} — ${escape(shape.label)}, auto-scheduling ${mode ? "on" : "off"} — ${escape(metric.better)} is better</text>
  <text class="subtitle" x="22" y="45">${escape(subtitle)}</text>
${legend}
${gridlines}
${xGrid}
  <line class="axis" x1="${plot.x0}" x2="${plot.x1}" y1="${plot.y1}" y2="${plot.y1}"/>
  <line class="axis" x1="${plot.x0}" x2="${plot.x0}" y1="${plot.y0}" y2="${plot.y1}"/>
${xTicks}
${axisTitles}
${ceiling}
${series}
</svg>
`;
}

// ---------------------------------------------------------------------------- entry

// Build shared metric axes from observed values, not the configured matrix.
function metricData(metric, rows) {
  const values = [];
  const sizes = [];

  for (const size of SIZES) {
    let present = false;
    for (const mode of MODES) {
      for (const shape of SHAPES) {
        for (const lib of LIBS) {
          const value = numberOrNull(
            findRow(rows, lib.id, shape.id, size, mode)?.[metric.key]
          );
          if (value != null) {
            values.push(value);
            present = true;
          }
        }
      }
    }
    if (present) sizes.push(size);
  }

  return { values, sizes };
}

export function writeCharts({
  machineId = REFERENCE_MACHINE,
  version = ROUND_VERSION,
} = {}) {
  const { metricRows, env } = readMachine(machineId);
  const refreshHz = Number(env.refresh_hz);
  const outDir = chartsDir(version);
  mkdirSync(outDir, { recursive: true });

  const written = [];
  for (const metric of METRICS) {
    const { values, sizes } = metricData(metric, metricRows);
    const linear = LINEAR_METRICS.has(metric.key);
    const usable = values.filter((v) => (linear ? v >= 0 : v > 0));
    if (!usable.length || !sizes.length) {
      continue;
    }

    const xs = xScale(sizes);
    const scale = linear
      ? linearScale(usable, Number.isFinite(refreshHz) ? refreshHz : null)
      : logScale(usable);

    for (const mode of MODES) {
      for (const shape of SHAPES) {
        const svg = renderChart({
          metric, mode, shape, rows: metricRows, machineId, xs, scale, refreshHz,
        });
        if (!svg) {
          continue;
        }
        const name = chartName(metric, mode, shape);
        writeFileSync(join(outDir, name), svg, "utf8");
        written.push(name);
      }
    }
  }
  return { dir: outDir, written };
}

/**
 * One test and mode's figures, one per dataset shape, as markdown images.
 *
 * A metric's four charts share their axes, so a reader compares its shapes and modes across the
 * figures placed above each of its tables. A chart no series could be drawn into is absent from
 * `written` and is left out here.
 */
export function chartFigures(metric, mode, written) {
  return SHAPES.map((shape) => ({
    name: chartName(metric, mode, shape),
    alt: `${metric.label}, ${shape.label} dataset, auto-scheduling ${mode ? "on" : "off"}`,
  }))
    .filter((figure) => written.includes(figure.name))
    .map((figure) => `![${figure.alt}](charts/${figure.name})`);
}

// CLI entry
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const machineId = machineIdFromArgv(argv, REFERENCE_MACHINE);
  const version = roundVersionFromArgv(argv, ROUND_VERSION);
  const { dir, written } = writeCharts({ machineId, version });
  console.log(`Wrote ${written.length} charts to ${dir}`);
}
