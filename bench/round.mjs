// Creates a new report draft from the template; existing drafts are protected.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  ROUND_VERSION, LIBS, SIZES, METRICS, DATASET_YEARS, VIEWPORT, TIMEOUT_MS,
  PRACTICAL_EQUIVALENCE_PCT,
} from "./config.mjs";
import { hasFlag, roundVersionFromArgv } from "./argv.mjs";
import { renderTestScaffold } from "./reportBlocks.mjs";
import { reportPath } from "./paths.mjs";

const TEMPLATE_PATH = join(dirname(fileURLToPath(import.meta.url)), "report-template.md");

// Spaced thousands used in report prose.
const spaced = (n) => n.toLocaleString("en-US").replace(/,/g, " ");

/**
 * Everything the template can interpolate, from config so the standing prose cannot drift from
 * what the harness actually does. A placeholder with no entry here is an error rather than a
 * literal left in a published document.
 */
export function templateValues(version) {
  return {
    version,
    libCount: String(LIBS.length),
    metricCount: String(METRICS.length),
    sizeMin: spaced(SIZES[0]),
    sizeMax: spaced(SIZES.at(-1)),
    sizeRange: `${spaced(SIZES[0])} to ${spaced(SIZES.at(-1))}`,
    datasetYears: String(DATASET_YEARS),
    viewport: `${VIEWPORT.width} × ${VIEWPORT.height}`,
    timeoutMinutes: String(Math.round(TIMEOUT_MS / 60000)),
    practicalEquivalencePct: String(PRACTICAL_EQUIVALENCE_PCT),
    testSections: renderTestScaffold(),
  };
}

/**
 * Removes the leading TEMPLATE comment and verifies that it was removed.
 */
function stripTemplateNotes(text) {
  const stripped = text.replace(/^<!--\s*TEMPLATE[\s\S]*?-->\s*/, "");
  if (!stripped.startsWith("# ")) {
    throw new Error(
      "report-template.md did not strip to a heading — its leading TEMPLATE comment is " +
        "malformed, most likely containing a comment-closing sequence of its own."
    );
  }
  return stripped;
}

export function fillTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) {
      throw new Error(
        `unknown placeholder {{${key}}} in report-template.md — add it to templateValues() ` +
          `or fix the spelling. Known: ${Object.keys(values).join(", ")}`
      );
    }
    return values[key];
  });
}

export function newRound({ version = ROUND_VERSION } = {}) {
  const path = reportPath(version);
  if (existsSync(path)) {
    throw new Error(
      `${path} already exists — refusing to overwrite a draft. Delete it by hand if you really ` +
        "mean to start it again."
    );
  }

  const template = readFileSync(TEMPLATE_PATH, "utf8");
  const draft = fillTemplate(stripTemplateNotes(template), templateValues(version));

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, draft, "utf8");
  return { path, todos: (draft.match(/> \*\*TODO\*\*/g) ?? []).length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const version = roundVersionFromArgv(argv, ROUND_VERSION);

  if (hasFlag(argv, "--if-missing") && existsSync(reportPath(version))) {
    process.exit(0);
  }

  const { path, todos } = newRound({ version });
  console.log(
    `Created ${path}\n` +
      `  from bench/report-template.md — ${todos} section(s) marked TODO.\n` +
      "  Nothing checks them: grep TODO before you tag the round."
  );
}
