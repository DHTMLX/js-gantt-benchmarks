// Writes generated README and CONFIGURATION sections from reference results and the dataset
// generator.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  LIBS, SIZES, SHAPES, METRICS, REFERENCE_MACHINE, ROUND_VERSION,
} from "./config.mjs";
import { machineIdFromArgv } from "./argv.mjs";
import { machineTitle } from "./machine.mjs";
import { readMachine } from "./results.mjs";
import {
  environmentLine, findRow, renderDatasetShapes, runsPerCellText,
} from "./tables.mjs";
import { renderLibraryList } from "./libraryList.mjs";
import { renderWinnersBlock } from "./winners.mjs";
import { replaceBetweenMarkers } from "./markers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const README_PATH = join(ROOT, "README.md");
const CONFIGURATION_PATH = join(ROOT, "CONFIGURATION.md");

const numberLabel = (value) => Number(value).toLocaleString("en-US");

const joinLabels = (labels) => {
  if (labels.length < 2) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
};

const completedSizes = (metricRows) =>
  SIZES.filter((size) =>
    LIBS.every((lib) =>
      SHAPES.every((shape) =>
        [false, true].every((mode) =>
          findRow(metricRows, lib.id, shape.id, size, mode)
        )
      )
    )
  );

const latestMeasurementDate = (metricRows) =>
  metricRows
    .map((row) => String(row.measured_at ?? "").slice(0, 10))
    .filter(Boolean)
    .sort()
    .at(-1);

export function renderSummaryBlock({ metricRows, env, machineId, sessions = [] }) {
  const availableSizes = completedSizes(metricRows);
  const complete = availableSizes.length === SIZES.length;
  const availableSizeText = joinLabels(availableSizes.map(numberLabel));
  const missingSizeText = joinLabels(
    SIZES.filter((size) => !availableSizes.includes(size)).map(numberLabel)
  );
  const measuredOn = latestMeasurementDate(metricRows);
  const runText = runsPerCellText(env, sessions);

  return [
    `### Round v${ROUND_VERSION}${complete ? "" : " — preliminary test run"}`,
    "",
    `- ${LIBS.length} libraries, ${SHAPES.length} dataset shapes and ${METRICS.length} metrics, ` +
      "with auto-scheduling disabled and enabled where the component supports it.",
    complete
      ? `- Complete matrix: ${availableSizeText} tasks.`
      : `- Completed sizes: ${availableSizeText} tasks. The planned matrix also includes ` +
        `${missingSizeText} tasks.`,
    `- Reference machine ${machineTitle(machineId)} — ${environmentLine(env)}.` +
      `${runText ? ` ${runText}` : ""}` +
      `${measuredOn ? ` Reference data updated \`${measuredOn}\`.` : ""}`,
    "",
    `[\`Full report\`](reports/${ROUND_VERSION}/report-v${ROUND_VERSION}.md) · ` +
      `[\`Machine-readable results\`](reports/${ROUND_VERSION}/summary.json) · ` +
      `[\`Raw measurements\`](reports/${ROUND_VERSION}/raw-results/)`,
  ].join("\n");
}

export function writeReadme({ machineId = REFERENCE_MACHINE } = {}) {
  const machine = readMachine(machineId);
  let text = readFileSync(README_PATH, "utf8");
  text = replaceBetweenMarkers(text, "LIBRARIES", renderLibraryList(machine.metricRows));
  text = replaceBetweenMarkers(text, "SUMMARY", renderSummaryBlock(machine));
  text = replaceBetweenMarkers(text, "WINNERS", renderWinnersBlock(machine.metricRows));
  writeFileSync(README_PATH, text, "utf8");
  return README_PATH;
}

/**
 * The dataset section of CONFIGURATION.md: what the two shapes are and what each holds at
 * every size. Generated because it is a table of counts, and a hand-typed count is a count
 * that can disagree with the generator.
 */
export function writeConfiguration() {
  const text = readFileSync(CONFIGURATION_PATH, "utf8");
  writeFileSync(
    CONFIGURATION_PATH,
    replaceBetweenMarkers(text, "DATASET", renderDatasetShapes()),
    "utf8"
  );
  return CONFIGURATION_PATH;
}

// CLI entry
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const machineId = machineIdFromArgv(process.argv.slice(2), REFERENCE_MACHINE);
  console.log(`Wrote ${writeReadme({ machineId })}`);
  console.log(`Wrote ${writeConfiguration()}`);
}
