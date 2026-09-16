// Automation contract exposed as window.__bench. The runner and toolbar use this same object.

import LIBRARIES from "../apps.json";

// Import for side effects so listeners install before an app creates its chart.
import "./benchErrors.js";

import {
  BUSY_FRAME_MS,
  DATASET_YEARS,
  QUIET_FRAMES,
  SETTLE_CAP_MS,
} from "./benchConfig.js";
import { DEFAULT_SHAPE } from "./dataset.js";

// The runner may override this per run; manual use starts with the shared cap.
let settleCapMs = SETTLE_CAP_MS;

// Waits for quiet frames after the operation. The cap starts at `startedAt`, and a capped
// operation reports `settled: false` rather than a duration.
function waitForQuiet(startedAt) {
  return new Promise((resolve) => {
    const deadline = startedAt + settleCapMs;
    let firstFrameAt = null;
    let lastBusyAt = null;
    let previous = performance.now();
    let quiet = 0;
    let frames = 0;
    let busyFrames = 0;
    let maxFrameMs = 0;

    const done = (settled, at) =>
      resolve({
        settled,
        at,
        frames,
        busyFrames,
        maxFrameMs: Math.round(maxFrameMs),
      });

    const tick = () => {
      const now = performance.now();
      const delta = now - previous;
      previous = now;
      frames++;
      if (firstFrameAt == null) {
        firstFrameAt = now;
      }
      if (delta > maxFrameMs) {
        maxFrameMs = delta;
      }

      if (delta > BUSY_FRAME_MS) {
        busyFrames++;
        lastBusyAt = now;
        quiet = 0;
      } else {
        quiet++;
      }

      if (quiet >= QUIET_FRAMES) {
        done(true, lastBusyAt ?? firstFrameAt);
        return;
      }
      // If rAF stops arriving, the runner's outer timeout reports the wedged page.
      if (now >= deadline) {
        done(false, now);
        return;
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
}

// Plain paint barrier, for untimed transitions between metrics.
const settle = () =>
  new Promise((resolve) =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setTimeout(resolve, 0))
    )
  );

// Selectors come from the app registry. Scrollers are reset between metrics; rows define
// first paint.
const SCROLLER_SELECTORS = LIBRARIES.flatMap((lib) => lib.dom.scrollers).join(", ");

const ROW_SELECTORS = LIBRARIES.flatMap((lib) => lib.dom.rows).join(", ");

const countRows = (root) => root?.querySelectorAll(ROW_SELECTORS).length ?? 0;

// First paint is the first row observed from an empty chart; existing rows produce no value.
function watchFirstRender(root, startedAt) {
  const baseline = countRows(root);
  let paintedAt = null;
  let running = true;

  const tick = () => {
    if (!running) {
      return;
    }
    if (countRows(root) > 0) {
      paintedAt = performance.now();
      return;
    }
    requestAnimationFrame(tick);
  };

  if (baseline === 0) {
    requestAnimationFrame(tick);
  } else {
    running = false;
  }

  return () => {
    running = false;
    return paintedAt == null ? null : paintedAt - startedAt;
  };
}

// Counts frames over exactly the scroll window; the on-screen FPS counter is not used for
// the published metric.
function startFrameMeter() {
  const buckets = [];
  const started = performance.now();
  let frames = 0;
  let bucketFrames = 0;
  let bucketStart = started;
  let running = true;

  const tick = () => {
    if (!running) return;
    const now = performance.now();
    frames++;
    bucketFrames++;
    const bucketElapsed = now - bucketStart;
    if (bucketElapsed >= 1000) {
      buckets.push(Math.round((bucketFrames * 1000) / bucketElapsed));
      bucketFrames = 0;
      bucketStart = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return () => {
    running = false;
    const elapsed = performance.now() - started;
    const average = elapsed > 0 ? Math.round((frames * 1000) / elapsed) : 0;
    return {
      average,
      min: buckets.length ? Math.min(...buckets) : average,
      frames,
      durationMs: Math.round(elapsed),
    };
  };
}

/** Installs and returns the automation contract exposed as `window.__bench`. */
export function installBench({ chart, fpsCounter, supportsAutoScheduling = true }) {
  // Runs an operation through the common settling boundary.
  async function timed(operation, { firstPaint = false } = {}) {
    const startedAt = performance.now();
    const stopWatchingPaint = firstPaint
      ? watchFirstRender(chart.element, startedAt)
      : null;

    await operation();

    const quiet = await waitForQuiet(startedAt);
    const result = {
      ms: quiet.settled ? quiet.at - startedAt : null,
      settled: quiet.settled,
      frames: quiet.frames,
      busyFrames: quiet.busyFrames,
      maxFrameMs: quiet.maxFrameMs,
    };
    if (stopWatchingPaint) {
      result.ttfp = stopWatchingPaint();
    }
    return result;
  }

  const bench = {
    ready: true,
    supportsAutoScheduling,

    // Keeps the in-page cap aligned with the runner's timeout.
    configure({ settleCapMs: cap } = {}) {
      if (!Number.isFinite(cap) || cap <= 0) {
        throw new Error(`__bench.configure: settleCapMs must be a positive number, got ${cap}`);
      }
      settleCapMs = cap;
    },

    // Applied before load() so the mode switch never lands inside a timed region.
    async setAutoScheduling(enabled) {
      if (!supportsAutoScheduling) {
        return;
      }
      await chart.setAutoScheduling(enabled);
      await settle();
    },

    // Both shapes hold `count` records; the default density matches measured loads.
    load(count, years = DATASET_YEARS, shape = DEFAULT_SHAPE) {
      return timed(() => chart.loadTasks(count, years, shape), { firstPaint: true });
    },

    async scroll() {
      fpsCounter?.reset?.();
      const stop = startFrameMeter();
      const motion = await chart.scrollTest();
      const stats = stop();
      await settle();
      // Preserve no-op distance so an absent/non-scrollable pane cannot look like a score.
      return { ...stats, ...(motion ?? {}) };
    },

    move() {
      return timed(() => chart.moveTaskOnly());
    },

    bulkEdit(count) {
      return timed(() => chart.bulkEditOnly(count));
    },

    memory() {
      return performance.memory
        ? Math.round(performance.memory.usedJSHeapSize / 1048576)
        : null;
    },

    // Reset the viewport outside the move measurement and wait for virtualization to settle.
    async scrollTop() {
      const root = chart.element;
      if (!root) {
        return;
      }
      root.querySelectorAll(SCROLLER_SELECTORS).forEach((el) => {
        el.scrollTop = 0;
      });
      root.scrollTop = 0;
      await waitForQuiet(performance.now());
    },
  };

  window.__bench = bench;
  return bench;
}
