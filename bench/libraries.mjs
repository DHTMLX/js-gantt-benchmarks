// Loads and validates the app registry and the round's selected apps. Registry entries are
// complete definitions; missing values are errors rather than implicit defaults.
//
// Registry fields include identity/path/package metadata, documentation/delivery labels,
// auto-scheduling support, and DOM selectors for painted rows and scrollers.

import { readFileSync } from "node:fs";

const SOURCE = new URL("../apps.json", import.meta.url);
const SELECTION = new URL("../round-apps.json", import.meta.url);

const TEXT_FIELDS = ["name", "docs", "delivery"];

// Exactly one source supplies the version label.
const VERSION_FIELDS = ["package", "version"];

const fail = (message) => {
  throw new Error(`apps.json: ${message}`);
};

const failSelection = (message) => {
  throw new Error(`round-apps.json: ${message}`);
};

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

const isSelectorList = (value) =>
  Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);

function assertUnique(entries, field) {
  const seen = new Map();
  for (const entry of entries) {
    const value = entry[field];
    if (seen.has(value)) {
      fail(`"${seen.get(value)}" and "${entry.id}" share the same ${field} (${value})`);
    }
    seen.set(value, entry.id);
  }
}

function assertEntry(entry, index) {
  const where = `entry ${index}`;

  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    fail(`${where} is not an object`);
  }
  if (!/^[a-z][a-z0-9-]*$/.test(entry.id ?? "")) {
    fail(`${where} needs an id of lowercase letters, digits and dashes, got "${entry.id}"`);
  }

  const at = `"${entry.id}"`;

  for (const field of TEXT_FIELDS) {
    if (!isNonEmptyString(entry[field])) {
      fail(`${at} needs a non-empty ${field}`);
    }
  }

  const stated = VERSION_FIELDS.filter((field) => field in entry);
  if (stated.length !== 1) {
    fail(
      `${at} needs exactly one of ${VERSION_FIELDS.join(" or ")} — ` +
        (stated.length ? "it has both" : "it has neither")
    );
  }
  if (!isNonEmptyString(entry[stated[0]])) {
    fail(`${at} needs a non-empty ${stated[0]}`);
  }

  // A path segment, so it is checked rather than trusted into one.
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(entry.dir ?? "")) {
    fail(`${at} needs a dir that is a plain directory name, got "${entry.dir}"`);
  }
  if (!Number.isInteger(entry.port) || entry.port < 1024 || entry.port > 65535) {
    fail(`${at} needs an integer port between 1024 and 65535, got ${entry.port}`);
  }
  if (typeof entry.supportsAutoScheduling !== "boolean") {
    fail(`${at} needs supportsAutoScheduling to be true or false`);
  }
  if (entry.dom === null || typeof entry.dom !== "object" || Array.isArray(entry.dom)) {
    fail(`${at} needs a dom object with rows and scrollers`);
  }
  for (const field of ["rows", "scrollers"]) {
    if (!isSelectorList(entry.dom[field])) {
      fail(`${at} needs dom.${field} to be a non-empty array of CSS selectors`);
    }
  }

  const known = new Set([
    ...TEXT_FIELDS,
    ...VERSION_FIELDS,
    "id",
    "dir",
    "port",
    "supportsAutoScheduling",
    "dom",
  ]);
  const unknown = Object.keys(entry).filter((key) => !known.has(key));
  if (unknown.length) {
    fail(`${at} carries unknown field(s): ${unknown.join(", ")}`);
  }
  const unknownDom = Object.keys(entry.dom).filter((key) => key !== "rows" && key !== "scrollers");
  if (unknownDom.length) {
    fail(`${at} carries unknown dom field(s): ${unknownDom.join(", ")}`);
  }
}

/**
 * The ids of the apps this round measures, from `round-apps.json`.
 *
 *   apps   ids from `apps.json`, the apps this round measures. Required, and every id
 *          has to resolve: a round that quietly dropped a misspelled app would publish a
 *          comparison with one component missing and nothing saying so.
 *
 * The order here is not read. `apps.json` orders the apps, for the same reason it holds
 * everything else about them — the order is what every table and chart renders in, and two
 * files that both claimed it would disagree.
 */
function loadRoundApps(entries) {
  let selection;
  try {
    selection = JSON.parse(readFileSync(SELECTION, "utf8"));
  } catch (err) {
    failSelection(`cannot be read as JSON — ${err.message}`);
  }

  if (selection === null || typeof selection !== "object" || Array.isArray(selection)) {
    failSelection("must be an object with an apps array");
  }
  const unknown = Object.keys(selection).filter((key) => key !== "apps");
  if (unknown.length) {
    failSelection(`carries unknown field(s): ${unknown.join(", ")}`);
  }

  const ids = selection.apps;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(isNonEmptyString)) {
    failSelection("needs apps to be a non-empty array of app ids");
  }

  const duplicated = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (duplicated.length) {
    failSelection(`names the same app twice: ${duplicated.join(", ")}`);
  }

  const registered = new Set(entries.map((entry) => entry.id));
  const missing = ids.filter((id) => !registered.has(id));
  if (missing.length) {
    failSelection(
      `names app(s) apps.json does not register: ${missing.join(", ")} — ` +
        `it registers ${[...registered].join(", ")}`
    );
  }

  return new Set(ids);
}

/**
 * Every registered app, in the order `apps.json` lists them — which is the order they are
 * measured in and the order every generated table renders.
 */
export function loadLibraries() {
  let entries;
  try {
    entries = JSON.parse(readFileSync(SOURCE, "utf8"));
  } catch (err) {
    fail(`cannot be read as JSON — ${err.message}`);
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    fail("must be a non-empty array of library entries");
  }

  entries.forEach(assertEntry);
  assertUnique(entries, "id");
  assertUnique(entries, "dir");
  assertUnique(entries, "port");

  return entries;
}

/**
 * The apps this round measures, in the same order.
 *
 * The whole registry is validated first, not just the selected part: an entry that only breaks
 * the rules while it sits out a round would break them again on the round it returns for.
 */
export function loadRoundLibraries() {
  const entries = loadLibraries();
  const selected = loadRoundApps(entries);
  return entries.filter((entry) => selected.has(entry.id));
}
