// The generated blocks of a round report: the marker each one fills, and the section scaffold a
// new draft carries. One module, so a draft and the fill cannot disagree about a marker's name.

import { METRICS } from "./config.mjs";
import { chartFigures } from "./charts.mjs";
import {
  measurementContextLines, renderDatasetShapes, renderMarkerLegend, renderResultNotes,
  renderTestBody, tableView,
} from "./tables.mjs";
import { renderWinnersBlock } from "./winners.mjs";
import { renderLibraryList } from "./libraryList.mjs";

/** A test's block is named after its metric, so no list of tests is kept anywhere else. */
const testMarker = (metric) => `TEST:${metric.key}`;

/**
 * The Results chapter of a fresh draft: per test, the block holding its charts and tables, then
 * the conclusion its editor draws from them. Expanded from METRICS at draft time, so a metric
 * added to the harness arrives with a section and a TODO of its own.
 */
export const renderTestScaffold = () =>
  METRICS.map((metric) =>
    [
      `### Test: ${metric.label}`,
      "",
      `<!-- BENCH:${testMarker(metric)} -->`,
      `<!-- /BENCH:${testMarker(metric)} -->`,
      "",
      "#### What these results show",
      "",
      `> **TODO** — interpret the ${metric.label} tables above following`,
      "> [`BENCHMARK_REPORT_EDITOR.md`]" +
        "(../../bench/BENCHMARK_REPORT_EDITOR.md#per-test-conclusions). Replace this entire",
      "> block, keeping the heading.",
      "",
    ].join("\n")
  ).join("\n");

/** Marker name to generated markdown, for every block a round report holds. */
export function reportBlocks(machine, written) {
  const view = tableView(machine);

  const tests = METRICS.map((metric) => [
    testMarker(metric),
    renderTestBody(metric, view, (m, mode) => chartFigures(m, mode, written)),
  ]);

  return new Map([
    ["LIBRARIES", renderLibraryList(machine.metricRows)],
    // The measurement context belongs beside the first claims a reader sees.
    ["MACHINE", measurementContextLines(machine).join(" ")],
    ["WINNERS", renderWinnersBlock(machine.metricRows)],
    ["SHAPES", renderDatasetShapes()],
    ...tests,
    // The legend covers the markers the tables above used, so it is rendered after them.
    ["MARKERS", renderMarkerLegend(view.used)],
    ["RESULT-NOTES", renderResultNotes(machine, view.outcomes)],
  ]);
}
