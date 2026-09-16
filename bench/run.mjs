// Drives each app through window.__bench and writes raw evidence for one machine.

import { chromium } from "playwright";

import {
  LIBS, REGISTERED_LIBS,
  SIZES, MODES, SHAPES, METRICS, RUNS, TIMEOUT_MS, TIMEOUT_GRACE_MS, VIEWPORT, LAUNCH_ARGS,
  BULK_EDIT_OPS, DATASET_YEARS, FPS_OVER_REFRESH_TOLERANCE,
  SKIP_LARGER_AFTER_TOTAL_FAILURE, HARNESS_VERSION, CASCADE_STEPS,
} from "./config.mjs";
import { buildApps, startServers, stopServers } from "./servers.mjs";
import { resolveVersions } from "./versions.mjs";
import { markerForNote, writeTables } from "./tables.mjs";
import { assertMachineId, detectMachineId } from "./machine.mjs";
import { inspectStore, renderInspection } from "./coherence.mjs";
import { startSleepInhibitor } from "./inhibitSleep.mjs";
import { measureRefreshHz } from "./refreshRate.mjs";
import { listMachines, newSessionId, openResultStore } from "./results.mjs";
import os from "node:os";

function parseArgs(argv) {
  const opts = {
    build: true, headless: false, runs: RUNS,
    libs: null, sizes: null, modes: null, shapes: null,
    machine: null,
    skipLarger: SKIP_LARGER_AFTER_TOTAL_FAILURE,
    timeoutMs: TIMEOUT_MS,
  };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--no-build": opts.build = false; break;
      case "--no-skip": opts.skipLarger = false; break;
      case "--headless": opts.headless = true; break;
      case "--runs": opts.runs = Number(argv[++i]); break;
      case "--timeout": opts.timeoutMs = Number(argv[++i]) * 1000; break;
      case "--machine": opts.machine = assertMachineId(argv[++i]); break;
      case "--lib": opts.libs = argv[++i].split(","); break;
      case "--shape": opts.shapes = argv[++i].split(","); break;
      case "--size": opts.sizes = argv[++i].split(",").map(Number); break;
      case "--mode":
        opts.modes = argv[++i].split(",").map((v) => v === "on" || v === "true");
        break;
      default:
        throw new Error(`unknown argument: ${argv[i]}`);
    }
  }
  return opts;
}

function withTimeout(promise, ms, what) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`DNF:${what}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const numeric = (x) => typeof x === "number" && Number.isFinite(x);

const median = (values) => {
  const v = values.filter(numeric).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2);
};

// Partial metrics are recorded as `fps=1/3 bulk=2/3`; medians use completed runs.
const sampleCounts = (runs) =>
  METRICS.map(({ key }) => [key, runs.filter((r) => numeric(r[key])).length])
    .filter(([, n]) => n > 0 && n < runs.length)
    .map(([key, n]) => `${key}=${n}/${runs.length}`)
    .join(" ");

const round = (x) => (typeof x === "number" ? Math.round(x) : x);

// Conflicting per-run failures collapse to one generic cell note; detail stays in runs.csv.
const cellNote = (runs) => {
  const notes = runs.map((r) => r.note).filter(Boolean);
  const outcomes = new Set(notes.map((note) => markerForNote(note) ?? note));
  if (outcomes.size > 1) return "mixed — the runs behind this figure failed differently; see runs.csv";
  return notes[0] ?? "";
};

// Infrastructure failures are not library failures and do not feed the skip cascade.
const ENVIRONMENT_ERROR = /net::ERR_|ERR_CONNECTION|page\.goto: Timeout|Target (page|closed)/i;

// Non-settling steps are failures, not cap-sized durations, and feed the timeout cascade.
class DidNotSettle extends Error {
  constructor(what, { frames, busyFrames, maxFrameMs }) {
    super(
      `did not settle (${what}; ${frames} frames, ${busyFrames} over threshold, ` +
        `worst ${maxFrameMs} ms)`
    );
  }
}

function requireSettled(result, what) {
  if (!result?.settled) {
    throw new DidNotSettle(what, result ?? { frames: 0, busyFrames: 0, maxFrameMs: 0 });
  }
  return result;
}

// Block network requests during measurement so remote assets cannot affect load timing.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

const blockNetwork = (context) =>
  context.route("**/*", (route) => {
    const { protocol, hostname } = new URL(route.request().url());
    const offMachine = protocol.startsWith("http") && !LOCAL_HOSTS.has(hostname);
    return offMachine ? route.abort() : route.continue();
  });

// A total failure at a smaller size stops the later chain and records its source step/size.
const stopChain = (row, stopAt) => {
  row.note = `skipped — ${stopAt.step} failed at ${stopAt.size}`;
  return row;
};

async function runCell(lib, shape, size, autoScheduling, opts, version, stopAt) {
  const browser = await chromium.launch({ headless: opts.headless, args: LAUNCH_ARGS });
  const context = await browser.newContext({ viewport: VIEWPORT });
  await blockNetwork(context);
  const page = await context.newPage();

  const row = {
    lib: lib.id, version, shape, size, autoScheduling,
    ttr: null, ttfp: null, memory: null, fps: null, fpsMin: null, move: null, bulk: null,
    note: "",
  };
  // Tracks the active link so throws between steps do not exhaust the cascade.
  let currentStep = null;

  // Playwright fallback for errors before collector setup and browser-tab crashes; the collector
  // handles errors raised during a measured step.
  page.on("pageerror", (err) => {
    if (!row.note) row.note = `error: ${String(err.message).split("\n")[0].slice(0, 120)}`;
  });
  page.on("crash", () => {
    if (!row.note) row.note = "error: the browser tab crashed";
  });

  // Begin/end surround each assignment: end flushes and raises collector errors before the
  // figure is stored, so the bad measurement is discarded. The collector catches errors
  // reported by rendering/framework code that page.evaluate does not throw.
  const beginStep = (step) => page.evaluate((s) => window.__benchErrors.begin(s), step);

  const endStep = async (step) => {
    await page.evaluate(() => window.__benchErrors.flush());
    const errors = await page.evaluate((s) => window.__benchErrors.end(s), step);
    if (errors.length) {
      throw new Error(errors[0].message);
    }
  };

  // The runner timeout sits just beyond the shim's settling threshold.
  const stepTimeout = opts.timeoutMs + TIMEOUT_GRACE_MS;

  try {
    // A page that never reports ready or throws during configuration fails the load.
    currentStep = "ttr";
    await page.goto(`http://localhost:${lib.port}/`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__bench?.ready === true, null, { timeout: 60000 });

    await page.evaluate((cap) => window.__bench.configure({ settleCapMs: cap }), opts.timeoutMs);
    await page.evaluate((v) => window.__bench.setAutoScheduling(v), autoScheduling);
    await beginStep("ttr");

    const load = requireSettled(
      await withTimeout(
        page.evaluate(
          ({ n, years, datasetShape }) => window.__bench.load(n, years, datasetShape),
          { n: size, years: DATASET_YEARS, datasetShape: shape }
        ),
        stepTimeout,
        "ttr"
      ),
      "ttr"
    );
    await endStep("ttr");
    row.ttr = load.ms;
    row.ttfp = load.ttfp;
    currentStep = null;

    // Read retained heap after collection.
    const cdp = await context.newCDPSession(page);
    try {
      await cdp.send("HeapProfiler.collectGarbage");
    } catch {
      // Forced-GC failure is non-fatal; the heap sample still proceeds without collection.
      console.warn(
        `  ${lib.id} / ${shape} / ${size} / AS ${autoScheduling ? "on" : "off"}: ` +
          "forced GC failed — memory sampled without it"
      );
    }
    row.memory = await page.evaluate(() => window.__bench.memory());

    // Each remaining link stops at the exhausted step; the completed prefix is retained.
    if (stopAt?.step === "fps") return stopChain(row, stopAt);
    currentStep = "fps";
    await beginStep("fps");
    const fps = await withTimeout(
      page.evaluate(() => window.__bench.scroll()), stepTimeout, "fps"
    );
    await endStep("fps");
    // A no-op scroll publishes no FPS rather than the display's idle rate.
    if (fps?.scrolled) {
      row.fps = fps.average ?? null;
      row.fpsMin = fps.min ?? null;
    } else if (!row.note) {
      row.note = "fps unavailable — scroll moved nothing (no scrollable pane, or already at the bottom)";
    }
    currentStep = null;

    await page.evaluate(() => window.__bench.scrollTop());

    if (stopAt?.step === "move") return stopChain(row, stopAt);
    currentStep = "move";
    await beginStep("move");
    const move = requireSettled(
      await withTimeout(page.evaluate(() => window.__bench.move()), stepTimeout, "move"),
      "move"
    );
    await endStep("move");
    row.move = move.ms;
    currentStep = null;

// Bulk edit runs last because it mutates the dataset.
    if (stopAt?.step === "bulk") return stopChain(row, stopAt);
    currentStep = "bulk";
    await beginStep("bulk");
    const bulk = requireSettled(
      await withTimeout(
        page.evaluate((n) => window.__bench.bulkEdit(n), BULK_EDIT_OPS),
        stepTimeout,
        "bulk"
      ),
      "bulk"
    );
    await endStep("bulk");
    row.bulk = bulk.ms;
    currentStep = null;
  } catch (err) {
    const message = String(err.message);
    if (err instanceof DidNotSettle) {
      row.note = message;
    } else if (message.startsWith("DNF:")) {
      row.note = `DNF (${message.slice(4)})`;
    } else if (ENVIRONMENT_ERROR.test(message)) {
      row.environmentError = true;
      row.note = `environment: ${message.split("\n")[0].slice(0, 120)}`;
    } else {
      row.note = `error: ${message.split("\n")[0].slice(0, 120)}`;
    }
    // In-memory cascade link for library failures only; it is not written to CSV.
    if (!row.environmentError && currentStep) row.failedStep = currentStep;
  } finally {
    await browser.close();
  }

  return row;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  // Without --lib, use the round selection; --lib may drive any registered app.
  const libs = opts.libs
    ? REGISTERED_LIBS.filter((l) => opts.libs.includes(l.id))
    : LIBS;

  if (opts.libs) {
    const unknown = opts.libs.filter((id) => !REGISTERED_LIBS.some((l) => l.id === id));
    if (unknown.length) {
      throw new Error(
        `--lib names app(s) apps.json does not register: ${unknown.join(", ")} — ` +
          `it registers ${REGISTERED_LIBS.map((l) => l.id).join(", ")}`
      );
    }
    const offRound = libs.filter((l) => !LIBS.some((r) => r.id === l.id)).map((l) => l.id);
    if (offRound.length) {
      console.log(
        `[round] not selected in round-apps.json: ${offRound.join(", ")} — the rows are ` +
          "recorded like any other, and no published document reads them."
      );
    }
  }

  const shapes = SHAPES.filter((s) => !opts.shapes || opts.shapes.includes(s.id));
  // Ascending sizes make larger-size skipping well defined.
  const sizes = [...(opts.sizes ?? SIZES)].sort((a, b) => a - b);
  const modes = opts.modes ?? MODES;
  const machineId = opts.machine ?? detectMachineId();

  if (!libs.length) throw new Error("no libraries selected");
  if (!shapes.length) {
    throw new Error(
      `no dataset shapes selected — known shapes are ${SHAPES.map((s) => s.id).join(", ")}`
    );
  }

  // Resolve installed versions before building for coherence checks.
  const versions = resolveVersions(libs);
  console.log("[versions]", versions);

  // Start servers and the inhibitor before measured work; report drift for selected apps.
  const inspection = inspectStore({
    machineIds: listMachines().filter((id) => id === machineId),
    libs: [...LIBS, ...libs.filter((lib) => !LIBS.some((r) => r.id === lib.id))],
    driftFor: libs.map((lib) => lib.id),
  });
  if (inspection.machines.length) {
    console.log(`\n${renderInspection(inspection)}\n`);
  }

  const inhibitor = startSleepInhibitor();
  stopInhibitor = inhibitor.stop;

  if (opts.build) await buildApps(libs);
  await startServers(libs);

  // Capture environment in the harness; headed mode is the default for reliable FPS.
  const probe = await chromium.launch({ headless: opts.headless, args: LAUNCH_ARGS });
  const refreshHz = await measureRefreshHz(probe);

  // Read inhibitor state immediately before measurement and record the same value in env.json.
  if (inhibitor.active) {
    console.log(`[awake] ${inhibitor.mechanism}`);
    if (inhibitor.instructions) console.warn(`\nNOTE: ${inhibitor.instructions}\n`);
  } else {
    console.warn(
      `\nWARNING: sleep and screen blanking are not inhibited (${inhibitor.mechanism}).\n` +
        (inhibitor.instructions ? `  ${inhibitor.instructions}\n` : "")
    );
  }

  const env = {
    browser: `Chromium ${probe.version()}`,
    os: `${os.platform()} ${os.release()}`,
    cpu: os.cpus()[0]?.model?.trim() ?? "unknown",
    cores: os.cpus().length,
    ram_gb: Math.round(os.totalmem() / 1024 ** 3),
    refresh_hz: refreshHz ?? "unknown",
    headless: opts.headless,
    sleep_inhibited: inhibitor.active,
    sleep_inhibitor: inhibitor.mechanism,
    runs_per_cell: opts.runs,
    dataset_years: DATASET_YEARS,
    timeout_s: opts.timeoutMs / 1000,
  };
  await probe.close();
  console.log("\n[env]", env, "\n");

  const started = new Date();
  const session = newSessionId(started);
  const measuredAt = started.toISOString();
  const store = openResultStore({ machineId, session, env, startedAt: started });
  console.log(`[out] ${store.dir}  (session ${session})\n`);

  // Exhaustion is keyed by library, mode, and shape; `{ step, size }` identifies the source.
  const stepExhausted = new Map();
  const exhaustedKey = (libId, mode, shape) => `${libId}|${mode}|${shape}`;

  // Returns a clean sweep only when every run fails at the same library step.
  const sweptStep = (cellRuns) => {
    const step = cellRuns[0]?.failedStep;
    return step && cellRuns.every((r) => r.failedStep === step) ? step : null;
  };
  const measuredFps = [];

  const placeholder = (lib, shape, size, mode, note) => ({
    lib: lib.id, version: versions[lib.id], shape, size, autoScheduling: mode,
    ttr: null, ttfp: null, memory: null, fps: null, fpsMin: null, move: null, bulk: null,
    note, harness: HARNESS_VERSION, session, measured_at: measuredAt,
  });

  // Keep sizes ascending and each app's cells contiguous for deterministic cascade/order checks.
  const cells = libs.flatMap((lib) =>
    shapes.flatMap(({ id: shape }) =>
      sizes.flatMap((size) => modes.map((mode) => ({ lib, shape, size, mode })))
    )
  );

  for (const { lib, shape, size, mode } of cells) {
    if (mode && !lib.supportsAutoScheduling) {
      store.upsertCell(
        placeholder(lib, shape, size, mode, "n/a — library has no auto-scheduling"),
        []
      );
      continue;
    }

    const label = `${lib.id} / ${shape} / ${size} / AS ${mode ? "on" : "off"}`;
    const key = exhaustedKey(lib.id, mode, shape);
    const stopAt = opts.skipLarger ? stepExhausted.get(key) ?? null : null;

    if (stopAt?.step === "ttr") {
      store.upsertCell(
        placeholder(lib, shape, size, mode, `skipped — could not load ${stopAt.size} tasks`),
        []
      );
      console.log(`> ${label}: skipped (could not load ${stopAt.size} tasks)`);
      continue;
    }

    // Compute medians per metric from completed runs and keep partial counts in `samples`.
    const medianOf = (runsSoFar) => {
      return {
        lib: lib.id, version: versions[lib.id], shape, size, autoScheduling: mode,
        ttr: round(median(runsSoFar.map((r) => r.ttr))),
        ttfp: round(median(runsSoFar.map((r) => r.ttfp))),
        memory: median(runsSoFar.map((r) => r.memory)),
        fps: median(runsSoFar.map((r) => r.fps)),
        fpsMin: median(runsSoFar.map((r) => r.fpsMin)),
        move: round(median(runsSoFar.map((r) => r.move))),
        bulk: round(median(runsSoFar.map((r) => r.bulk))),
        samples: sampleCounts(runsSoFar),
        note: cellNote(runsSoFar),
        harness: HARNESS_VERSION,
        session,
        measured_at: measuredAt,
      };
    };

    const cellRuns = [];
    const cellRunRows = [];
    for (let i = 0; i < opts.runs; i++) {
      const t0 = Date.now();
      const row = await runCell(lib, shape, size, mode, opts, versions[lib.id], stopAt);
      cellRuns.push(row);
      cellRunRows.push({
        ...row,
        run: i + 1,
        ttr: round(row.ttr), ttfp: round(row.ttfp),
        move: round(row.move), bulk: round(row.bulk),
        harness: HARNESS_VERSION,
        session, measured_at: new Date().toISOString(),
      });
      // Persist after every run so interruption preserves completed work; the next run upserts it.
      store.upsertCell(medianOf(cellRuns), cellRunRows);

      console.log(
        `  ${label} run ${i + 1}/${opts.runs} ` +
          `[${((Date.now() - t0) / 1000).toFixed(1)}s] ` +
          (row.note ||
            `ttr=${round(row.ttr)}ms ttfp=${round(row.ttfp)}ms mem=${row.memory}MB ` +
              `fps=${row.fps}/min${row.fpsMin} move=${round(row.move)}ms bulk=${round(row.bulk)}ms`)
      );
    }

    const medianRow = medianOf(cellRuns);
    if (typeof medianRow.fps === "number") measuredFps.push(medianRow.fps);
    console.log(`> ${label}:`, medianRow);

    // Cascade only after every run fails at the same link; a single bad run is an anomaly.
    const cascadeFor = `${lib.id} on ${shape} with auto-scheduling ${mode ? "on" : "off"}`;
    const failedStep = sweptStep(cellRuns);
    const known = stepExhausted.get(key);

    // Only an earlier failure tightens an existing exhaustion entry.
    if (
      failedStep &&
      (!known || CASCADE_STEPS.indexOf(failedStep) < CASCADE_STEPS.indexOf(known.step))
    ) {
      stepExhausted.set(key, { step: failedStep, size });
      if (opts.skipLarger) {
        console.log(
          failedStep === "ttr"
            ? `  could not load in any of ${cellRuns.length} run(s) — skipping larger ` +
              `datasets for ${cascadeFor}`
            : `  ${failedStep} failed in all ${cellRuns.length} run(s) — skipping it and ` +
              `every later step at larger sizes for ${cascadeFor}`
        );
      }
    }
  }

  // FPS materially above measured refresh means the browser is not vsync-locked.
  const maxFps = Math.max(0, ...measuredFps);
  if (!refreshHz) {
    console.warn(
      "\nWARNING: could not measure this machine's refresh rate, so the FPS column\n" +
        "  cannot be validated. Treat it as unverified."
    );
  } else if (maxFps > refreshHz * FPS_OVER_REFRESH_TOLERANCE) {
    console.warn(
      `\nWARNING: measured FPS reached ${maxFps}, above this machine's ${refreshHz} Hz\n` +
        "  refresh rate. requestAnimationFrame is not vsync-locked in this environment,\n" +
        "  so the FPS column is not trustworthy. Re-run on a machine with a real\n" +
        "  attached display."
    );
  }

  // Record final inhibitor state so mid-run sleep/blanking is visible in the environment block.
  if (env.sleep_inhibited && !inhibitor.active) {
    console.warn(
      "\nWARNING: the sleep inhibitor stopped at some point during this run. The environment\n" +
        "  block says inhibited, because it was when the run started. Cells measured after it\n" +
        "  stopped may have been taken on a machine that slept or blanked — look for a\n" +
        "  contiguous block of anomalous cells and re-run them.\n"
    );
  }

  const tables = writeTables({ machineId });

  console.log(`\nDone in ${((Date.now() - started.getTime()) / 60000).toFixed(1)} min`);
  console.log(`  ${store.resultsPath}`);
  console.log(`  ${store.runsPath}`);
  console.log(`  ${store.envPath}`);
  console.log(`  ${tables}`);
}

// Release the inhibitor on errors and signals.
let stopInhibitor = () => {};

const cleanup = () => { stopServers(); stopInhibitor(); };
const shutdown = () => { cleanup(); process.exit(1); };
// Handle terminal closure so preview servers and the inhibitor are cleaned up.
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGHUP", shutdown);

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(cleanup);
