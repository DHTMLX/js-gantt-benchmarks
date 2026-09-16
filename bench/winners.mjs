// Generates winner tables using the practical-equivalence rule; failed cells cannot win.

import { LIBS, METRICS, PRACTICAL_EQUIVALENCE_PCT, SHAPES } from "./config.mjs";
import { findRow, renderMarkdownTable } from "./tables.mjs";

// Which slice of the matrix the README shows. The report carries all four combinations of
// shape and mode at five sizes; this is one table per mode over one shape at three sizes,
// because a landing page that needs a paragraph to explain its axes has stopped being one.
//
// The project tree rather than the flat chain: it is the shape a real plan has, and the flat
// chain is explicitly a stress test. Both modes rather than one, because auto-scheduling is
// where the components differ most and an off-only table would flatter every engine equally.
export const WINNERS_VIEW = {
  shape: "tree",
  sizes: [1000, 10000, 100000],
  modes: [false, true],
};

const EQUIVALENCE_RATIO = 1 + PRACTICAL_EQUIVALENCE_PCT / 100;

// "DHTMLX", not "DHTMLX Gantt" — every row of this table is a Gantt component.
const shortName = (lib) => lib.name.replace(/ Gantt$/, "");

const spaced = (n) => n.toLocaleString("en-US").replace(/,/g, " ");

/**
 * Every component within the equivalence band of the best figure in one cell, best first.
 *
 * Empty when no component produced a figure — a cell nobody finished has no winner, and
 * printing the least-bad failure as one would be the opposite of what the marker means.
 */
export function winnersInCell(metric, metricRows, { shape, size, mode }) {
  const lowerIsBetter = metric.better === "lower";

  const measured = LIBS.map((lib) => ({
    lib,
    row: findRow(metricRows, lib.id, shape, size, mode),
  }))
    // An empty cell is a failure, and `Number("")` is 0 — which would win every
    // lower-is-better test in the table. Filtered before it is ever a number.
    .map(({ lib, row }) => {
      const raw = row?.[metric.key];
      return { lib, row, value: raw === "" || raw == null ? NaN : Number(raw) };
    })
    .filter(({ value }) => Number.isFinite(value));

  if (!measured.length) return [];

  const best = measured.reduce((a, b) =>
    (lowerIsBetter ? b.value < a.value : b.value > a.value) ? b : a
  );

  // A ratio needs two positive numbers. Zero is a real measurement here — it is what a
  // component scrolling below one frame per second rounds to — and it ties only with itself.
  const withinBand = (value) => {
    if (value === best.value) return true;
    if (value <= 0 || best.value <= 0) return false;
    return (lowerIsBetter ? value / best.value : best.value / value) <= EQUIVALENCE_RATIO;
  };

  return measured
    .filter(({ value }) => withinBand(value))
    .sort((a, b) => (lowerIsBetter ? a.value - b.value : b.value - a.value));
}

function renderCell(metric, metricRows, cell) {
  const winners = winnersInCell(metric, metricRows, cell);
  if (!winners.length) return "nobody finished";

  return winners.map((w) => shortName(w.lib)).join(" / ");
}

export function renderWinnersBlock(metricRows, view = WINNERS_VIEW) {
  const { shape, sizes, modes } = view;
  const shapeLabel = SHAPES.find((s) => s.id === shape)?.label ?? shape;

  return modes
    .map((mode) =>
      [
        `**${shapeLabel} dataset, auto-scheduling ${mode ? "enabled" : "disabled"}**`,
        "",
        renderMarkdownTable(
          ["Test", ...sizes.map((size) => `${spaced(size)} tasks`)],
          METRICS.map((metric) => [
            metric.label,
            ...sizes.map((size) => renderCell(metric, metricRows, { shape, size, mode })),
          ])
        ),
      ].join("\n")
    )
    .join("\n\n");
}
