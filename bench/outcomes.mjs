// What happened to each step of each measured cell, derived from the stored rows.
//
// The runner writes one note per row, naming the outcome the run ended with — so a step the run
// never reached printed the marker of a failure that happened somewhere else, and a step the
// larger-size cascade had already excluded lost that fact to whatever failed first. Both are
// recoverable: a failure note names the step it happened at, each step's figures are stored as it
// ends, and the cascade follows one rule over ascending sizes. Derived rather than stored, so a
// round measured before this module reads the same as one measured after it.

import { CASCADE_STEPS, METRICS, MODES, SHAPES, SIZES, STEP_ORDER } from "./config.mjs";

/** One cell of the matrix: one library, shape, size and mode. */
export const cellKey = ({ lib, shape, size, autoScheduling }) =>
  `${lib}|${shape}|${size}|${autoScheduling}`;

// A step's outcome. `measured` and `noFigure` describe a step that ran; the rest do not.
export const STATES = {
  measured: "measured",
  noFigure: "noFigure",
  dnf: "dnf",
  error: "error",
  unsettled: "unsettled",
  noScroll: "noScroll",
  environment: "environment",
  noAutoScheduling: "noAutoScheduling",
  skipped: "skipped",
  unreached: "unreached",
  mixed: "mixed",
  unknown: "unknown",
};

// The failures a run stops at, which are the ones the cascade is drawn from. An environment
// failure is not one: nothing about the library was measured, so it says nothing about a step.
const STOPPING = new Set([STATES.dnf, STATES.error, STATES.unsettled]);

// The failure notes that name the step they stopped at.
const NOTE_PATTERNS = [
  [/^DNF \((\w+)\)/, STATES.dnf],
  [/^did not settle \((\w+)[;)]/, STATES.unsettled],
];

// The notes of a step the cascade had already excluded when the run started.
const SKIP_PATTERNS = [
  [/^skipped — (\w+) failed at (\d+)/, (m) => ({ step: m[1], size: Number(m[2]) })],
  [/^skipped — could not load (\d+) tasks/, (m) => ({ step: "ttr", size: Number(m[1]) })],
];

const metricsOfStep = new Map(
  STEP_ORDER.map((step) => [step, METRICS.filter((metric) => metric.step === step)])
);

/**
 * One run's outcome per step.
 *
 * An `error:` note is the one failure that does not name its step, so the step it stopped at is
 * the first one with no figure.
 */
export function runStates(row) {
  const figured = (step) =>
    metricsOfStep.get(step).some((m) => row[m.key] !== "" && row[m.key] != null);

  const ran = (step) => ({ state: figured(step) ? STATES.measured : STATES.noFigure });
  const every = (outcome) => Object.fromEntries(STEP_ORDER.map((step) => [step, outcome]));

  // The run reached `step`, ended there, and never started the ones after it.
  const endedAt = (step, outcome) => {
    const at = STEP_ORDER.indexOf(step);
    return Object.fromEntries(
      STEP_ORDER.map((s, i) => [
        s,
        i < at ? ran(s) : i === at ? outcome : { state: STATES.unreached },
      ])
    );
  };

  // The cascade excluded `step` before the run started, and the ones after it with it.
  const skippedFrom = ({ step, size }) => {
    const at = STEP_ORDER.indexOf(step);
    const skipped = { state: STATES.skipped, sourceStep: step, sourceSize: size };
    return Object.fromEntries(STEP_ORDER.map((s, i) => [s, i < at ? ran(s) : skipped]));
  };

  const note = String(row.note ?? "").trim();

  if (!note) return Object.fromEntries(STEP_ORDER.map((step) => [step, ran(step)]));
  if (/^n\/a/.test(note)) return every({ state: STATES.noAutoScheduling });
  if (/^environment/.test(note)) return every({ state: STATES.environment });

  // A no-op scroll publishes no FPS and the steps after it are measured as usual.
  if (/^fps unavailable/.test(note)) {
    return Object.fromEntries(
      STEP_ORDER.map((step) => [step, step === "fps" ? { state: STATES.noScroll } : ran(step)])
    );
  }

  for (const [pattern, source] of SKIP_PATTERNS) {
    const match = pattern.exec(note);
    if (match) return skippedFrom(source(match));
  }

  for (const [pattern, state] of NOTE_PATTERNS) {
    const match = pattern.exec(note);
    if (match) return endedAt(match[1], { state });
  }

  if (/^error:/.test(note)) {
    const stopped = STEP_ORDER.find((step) => !figured(step));
    // An error with every figure present arrived after the last step, reported by the page
    // rather than by a measurement: the figures stand and the row carries the message.
    return stopped
      ? endedAt(stopped, { state: STATES.error })
      : every({ state: STATES.measured });
  }

  return every({ state: STATES.unknown });
}

/** One outcome for a cell's runs: their agreement, else a figure they produced, else `mixed`. */
function collapse(outcomes) {
  const distinct = [...new Set(outcomes.map((outcome) => outcome.state))];
  if (distinct.length === 1) return outcomes[0];
  if (distinct.includes(STATES.measured)) return { state: STATES.measured };

  // A step one run failed at and another never reached is reported as the failure: it was
  // attempted, and no run produced a figure. Only disagreeing failures are `mixed`.
  const failures = [...new Set(distinct.filter((state) => STOPPING.has(state)))];
  return failures.length === 1
    ? outcomes.find((outcome) => outcome.state === failures[0])
    : { state: STATES.mixed };
}

/** The step every run of a cell failed at, or null when they disagree or none failed. */
function sweptStep(perRun) {
  const stopped = perRun.map(
    (states) => CASCADE_STEPS.find((step) => STOPPING.has(states[step]?.state)) ?? null
  );
  const distinct = [...new Set(stopped)];
  return distinct.length === 1 && distinct[0] ? distinct[0] : null;
}

/**
 * Per-step outcomes for every cell in a machine's store, keyed by `cellKey`.
 *
 * Runs are collapsed per cell, then the cascade is replayed in the runner's own terms: a step
 * that failed in every run of a cell is not attempted at any larger size in the same shape and
 * mode, and an earlier failing step tightens that decision. Only a step the runs show as
 * unreached is reinterpreted, so `--no-skip`, which attempts what the cascade would have
 * excluded, keeps the measurement it produced.
 */
export function deriveOutcomes({ metricRows = [], runs = [] } = {}) {
  const runsByCell = new Map();
  for (const row of runs) {
    const key = cellKey(row);
    if (!runsByCell.has(key)) runsByCell.set(key, []);
    runsByCell.get(key).push(row);
  }

  const rowsByCell = new Map(metricRows.map((row) => [cellKey(row), row]));
  const outcomes = new Map();

  for (const lib of [...new Set(metricRows.map((row) => row.lib))]) {
    for (const shape of SHAPES) {
      for (const mode of MODES) {
        // Ascending sizes, because that is the order the cascade was decided in.
        let exhausted = null;

        for (const size of SIZES) {
          const key = cellKey({ lib, shape: shape.id, size, autoScheduling: String(mode) });
          const row = rowsByCell.get(key);
          if (!row) continue;

          // A cell with no runs of its own is a placeholder, and its note is its whole story.
          const perRun = (runsByCell.get(key) ?? [row]).map(runStates);
          const steps = Object.fromEntries(
            STEP_ORDER.map((step) => [step, collapse(perRun.map((states) => states[step]))])
          );

          if (exhausted) {
            const from = STEP_ORDER.indexOf(exhausted.step);
            STEP_ORDER.forEach((step, i) => {
              if (i < from || steps[step].state !== STATES.unreached) return;
              steps[step] = {
                state: STATES.skipped,
                sourceStep: exhausted.step,
                sourceSize: exhausted.size,
              };
            });
          }

          outcomes.set(key, { lib, shape: shape.id, size, mode, steps });

          const swept = sweptStep(perRun);
          if (
            swept &&
            (!exhausted || CASCADE_STEPS.indexOf(swept) < CASCADE_STEPS.indexOf(exhausted.step))
          ) {
            exhausted = { step: swept, size };
          }
        }
      }
    }
  }

  return outcomes;
}

/**
 * Every step the cascade kept from being attempted, grouped by library, shape and mode, with the
 * failure each group was inferred from and the sizes it applied at.
 */
export function skippedByCascade(outcomes) {
  const groups = new Map();

  for (const cell of outcomes.values()) {
    for (const step of STEP_ORDER) {
      const { state, sourceStep, sourceSize } = cell.steps[step];
      if (state !== STATES.skipped) continue;

      const key = [cell.lib, cell.shape, cell.mode, sourceStep, sourceSize].join("|");
      if (!groups.has(key)) {
        groups.set(key, {
          lib: cell.lib,
          shape: cell.shape,
          mode: cell.mode,
          sourceStep,
          sourceSize,
          sizes: new Set(),
        });
      }
      groups.get(key).sizes.add(cell.size);
    }
  }

  return [...groups.values()]
    .map((group) => ({ ...group, sizes: [...group.sizes].sort((a, b) => a - b) }))
    .sort(
      (a, b) =>
        a.lib.localeCompare(b.lib) ||
        a.shape.localeCompare(b.shape) ||
        String(a.mode).localeCompare(String(b.mode)) ||
        a.sizes[0] - b.sizes[0] ||
        CASCADE_STEPS.indexOf(a.sourceStep) - CASCADE_STEPS.indexOf(b.sourceStep)
    );
}
