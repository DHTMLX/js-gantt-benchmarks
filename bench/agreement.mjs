// Compares winners, meaningful reversals, and completion across machines using the published
// equivalence rule.

import { pathToFileURL } from "node:url";

import { LIBS, METRICS, MODES, PRACTICAL_EQUIVALENCE_PCT, SHAPES, SIZES } from "./config.mjs";
import { assertMachineId } from "./machine.mjs";
import { listMachines, readMachine } from "./results.mjs";
import { findRow } from "./tables.mjs";
import { winnersInCell } from "./winners.mjs";

const EQUIVALENCE_RATIO = 1 + PRACTICAL_EQUIVALENCE_PCT / 100;

const spaced = (n) => n.toLocaleString("en-US").replace(/,/g, " ");

/** Every test the matrix contains: one metric, on one shape, at one size, in one mode. */
function allTests() {
  const tests = [];
  for (const shape of SHAPES) {
    for (const size of SIZES) {
      for (const mode of MODES) {
        for (const metric of METRICS) {
          tests.push({
            metric,
            shape: shape.id,
            size,
            mode,
            label: `${metric.key.padEnd(6)} ${shape.id.padEnd(4)} ${spaced(size).padStart(7)} ${mode ? "on " : "off"}`,
          });
        }
      }
    }
  }
  return tests;
}

/** One library's figure for one test, or null where it produced none. */
function figure(rows, libId, test) {
  const raw = findRow(rows, libId, test.shape, test.size, test.mode)?.[test.metric.key];
  const value = raw === "" || raw == null ? NaN : Number(raw);
  return Number.isFinite(value) ? value : null;
}

const attempted = (rows, libId, test) =>
  Boolean(findRow(rows, libId, test.shape, test.size, test.mode));

/**
 * The components both machines attempted in one test — the only ones a comparison can be made
 * over. An incomplete machine would otherwise win every test its store is missing a rival in.
 */
const sharedLibs = (a, b, test) =>
  LIBS.filter((lib) => attempted(a.metricRows, lib.id, test) && attempted(b.metricRows, lib.id, test));

/**
 * How two figures for the same test relate: which is better, or `tie` when the gap is inside
 * the band this benchmark declines to call meaningful.
 */
function relation(x, y, lowerIsBetter) {
  if (x === y) return "tie";
  const [hi, lo] = x > y ? [x, y] : [y, x];
  // A ratio needs two positive numbers; zero is a real figure in the FPS column and ties
  // only with itself.
  if (lo > 0 && hi / lo <= EQUIVALENCE_RATIO) return "tie";
  const xWins = lowerIsBetter ? x < y : x > y;
  return xWins ? "x" : "y";
}

function comparePair(a, b) {
  const winnerDiffs = [];
  const contradictions = [];
  const completionDiffs = [];
  const compared = new Set();
  let tests = 0;
  let winnerChecks = 0;
  let pairs = 0;
  let softDiffs = 0;

  for (const test of allTests()) {
    const libs = sharedLibs(a, b, test);
    if (!libs.length) continue;
    tests += 1;
    for (const lib of libs) compared.add(lib.id);

    const shared = new Set(libs.map((lib) => lib.id));
    const rowsA = a.metricRows.filter((row) => shared.has(row.lib));
    const rowsB = b.metricRows.filter((row) => shared.has(row.lib));

    const cell = { shape: test.shape, size: test.size, mode: test.mode };
    const winnersA = winnersInCell(test.metric, rowsA, cell).map((w) => w.lib.id);
    const winnersB = winnersInCell(test.metric, rowsB, cell).map((w) => w.lib.id);

    if (winnersA.length && winnersB.length) {
      winnerChecks += 1;
      // Sets that share a name agree on who is at the front; only disjoint ones name
      // different components as fastest.
      if (!winnersA.some((id) => winnersB.includes(id))) {
        winnerDiffs.push({ test, a: winnersA, b: winnersB });
      }
    }

    for (const lib of libs) {
      const inA = figure(a.metricRows, lib.id, test);
      const inB = figure(b.metricRows, lib.id, test);
      if ((inA === null) !== (inB === null)) {
        completionDiffs.push({ test, lib: lib.id, on: inA === null ? b.machineId : a.machineId });
      }
    }

    const lowerIsBetter = test.metric.better === "lower";
    for (let i = 0; i < libs.length; i++) {
      for (let j = i + 1; j < libs.length; j++) {
        const [x, y] = [libs[i].id, libs[j].id];
        const xa = figure(a.metricRows, x, test);
        const ya = figure(a.metricRows, y, test);
        const xb = figure(b.metricRows, x, test);
        const yb = figure(b.metricRows, y, test);
        if (xa === null || ya === null || xb === null || yb === null) continue;

        pairs += 1;
        const relA = relation(xa, ya, lowerIsBetter);
        const relB = relation(xb, yb, lowerIsBetter);
        if (relA === relB) continue;

        if (relA === "tie" || relB === "tie") {
          softDiffs += 1;
          continue;
        }
        // One machine says x beats y, the other says y beats x, and both call the gap
        // meaningful. This is the finding that stops a round being published from either.
        const ahead = (rel) => (rel === "x" ? x : y);
        contradictions.push({
          test,
          a: `${ahead(relA)} (${xa} / ${ya})`,
          b: `${ahead(relB)} (${xb} / ${yb})`,
        });
      }
    }
  }

  return {
    tests, compared, winnerChecks, winnerDiffs, pairs, softDiffs, contradictions, completionDiffs,
  };
}

const refreshRates = (machine) =>
  [...new Set(machine.sessions.map((s) => s.refresh_hz).filter(Boolean))];

function renderPair(a, b, result) {
  const lines = [
    `${a.machineId} vs ${b.machineId}`,
    `  tests        ${result.tests} of ${allTests().length} attempted on both`,
    `  components   ${result.compared.size} of ${LIBS.length} appear in both stores` +
      (result.compared.size < LIBS.length ? ` — ${[...result.compared].join(", ")}` : ""),
    `  fastest      ${result.winnerChecks - result.winnerDiffs.length}/${result.winnerChecks} name the same component`,
    `  ordering     ${result.pairs} comparable component pairs, ` +
      `${result.contradictions.length} contradict, ${result.softDiffs} lead-vs-tie`,
    `  completion   ${result.completionDiffs.length} differ`,
  ];

  const hzA = refreshRates(a);
  const hzB = refreshRates(b);
  if (hzA.length && hzB.length && hzA.join() !== hzB.join()) {
    lines.push(
      `  note         displays refresh at ${hzA.join("/")} Hz and ${hzB.join("/")} Hz, ` +
        "so the FPS rows compare two different ceilings"
    );
  }

  const section = (title, rows) => {
    if (!rows.length) return;
    lines.push("", `  ${title}`);
    for (const row of rows) lines.push(`    ${row}`);
  };

  section(
    "fastest component differs",
    result.winnerDiffs.map(
      (d) => `${d.test.label}   ${a.machineId}: ${d.a.join(" / ")}   ${b.machineId}: ${d.b.join(" / ")}`
    )
  );
  section(
    "ordering contradicts",
    result.contradictions.map(
      (d) => `${d.test.label}   ${a.machineId}: ${d.a}   ${b.machineId}: ${d.b}`
    )
  );
  section(
    "completion differs",
    result.completionDiffs.map((d) => `${d.test.label}   ${d.lib} produced a figure only on ${d.on}`)
  );

  if (!result.contradictions.length) {
    lines.push(
      "",
      "  Neither machine reverses a lead the other calls meaningful."
    );
  }

  return lines.join("\n");
}

export function renderAgreement(machineIds) {
  if (machineIds.length < 2) {
    return `Nothing to compare — ${machineIds.length} machine(s) in raw-results/.`;
  }

  const machines = machineIds.map(readMachine);
  const blocks = [];
  for (let i = 0; i < machines.length; i++) {
    for (let j = i + 1; j < machines.length; j++) {
      blocks.push(renderPair(machines[i], machines[j], comparePair(machines[i], machines[j])));
    }
  }

  return [
    `Comparing decisions, not figures: a gap within ${PRACTICAL_EQUIVALENCE_PCT}% is a tie, ` +
      "as it is in the conclusions.",
    ...blocks,
  ].join("\n\n");
}

// CLI entry
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const named = process.argv.slice(2).filter((arg) => !arg.startsWith("--")).map(assertMachineId);
  console.log(renderAgreement(named.length ? named : listMachines()));
}
