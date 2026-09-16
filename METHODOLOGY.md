# How the numbers are measured

The matrix is 5 libraries × 2 dataset shapes × 5 sizes × 2 auto-scheduling modes × 6 metrics.
An automated runner records every run and ships the CSVs needed to inspect the spread.

This document covers *how* each metric is measured and what a missing value means. For
*what was configured* — each library's settings, the two dataset shapes, the versions
installed, and the places where the comparison is imperfect — see
[`CONFIGURATION.md`](CONFIGURATION.md).

It defines the standing protocol. Results, errors and observations from an individual round
belong in that round's report under [`reports/`](reports/).


## How the harness drives the libraries

Each library is a Vite app registered in [`apps.json`](apps.json). It exposes the same
`window.__bench` methods for loading, scrolling, moving a task, bulk editing and sampling
memory; the runner calls those methods directly and has no per-library selectors or parsers.

Measurement definitions live once in `shared/` and are imported by every app, including the
thresholds, dataset sizes/density and FPS scroll.

The shared toolbar calls those same methods, in runner order, so a published figure can be
checked interactively. It has no independent clock or thresholds; it labels *did not settle*,
and cannot reproduce a fresh browser per cell, forced garbage collection, or an external DNF
timeout.

Five properties of the environment matter to the numbers:

- **Built apps, not a dev server.** Each app is built and served with `vite preview` on a
  fixed port; dev-server and hot-reload overhead is excluded.
- **A fresh browser process per cell.** Heap state from a 100 000-task run would otherwise
  contaminate the next measurement.
- **Headed, with a pinned browser.** Headless Chromium does not provide display-tied FPS.
  `npm run setup` fetches pinned Chromium, and the runner records `browser.version()`.
- **Pinned libraries.** Every library is an install-time npm dependency at an exact version,
  installed with `npm ci` from a committed lockfile, so the thing being measured cannot change
  without this repository changing. Editions and registries are in
  [`CONFIGURATION.md`](CONFIGURATION.md#editions-and-delivery).
- **No network.** The measured browser context blocks requests outside the local preview
  server, preventing webfont requests or swaps from entering a measurement.


## What each metric measures

**Time to ready — until the UI goes quiet.** Every timed operation ends at *quiescence*:
frame timings are watched until five consecutive frames are under 32 ms, and the reported
figure is the timestamp of the **last busy frame**. This captures synchronous and deferred
rendering consistently and differs from a stopwatch around the API call.

**Time to first paint — the first frame with rows on screen.** Measured inside the same load
and start timestamp by checking for row elements each frame. It shows when content first
appears, separately from when the UI becomes ready.

**A page-level error discards the active step's figure.** This covers a direct throw, an
asynchronous rejection, or a framework-handled failure handed to the harness; otherwise the
call could resolve with a dead chart. The page associates `window.onerror`, `unhandledrejection`
and framework handoffs with the active step, then flushes one macrotask, a frame and another
macrotask before reading the result. Playwright remains the fallback for pre-shim errors and tab
crashes. `console.error` is excluded because React and the libraries use it for warnings.

**Memory — retained JS heap after a forced garbage collection.** Chrome uses
`--enable-precise-memory-info`; the runner calls `HeapProfiler.collectGarbage` before sampling.
If collection fails, it logs a warning and samples anyway.

**Scrolling FPS — frames counted over exactly the scroll window.** The scroll advances the
chart from the first row to the last in 100 equal steps, one step per animation frame. The
frame meter runs for the duration of that scroll and reports frames ÷ elapsed, plus the
worst one-second bucket inside the window as `fpsMin` in `results.csv`.

Stepping once per frame gives every library the same per-frame jump. The scrolled element is
library-specific, and the result includes the distance travelled; a scroll that moves nothing
publishes no FPS value because it would count idle frames.

The browser cannot draw faster than the display refreshes, so the machine's refresh rate is
the ceiling for this column. The runner measures that rate over ~40 idle frames at startup,
records it in the environment block above the published tables, and flags the column as
invalid if an FPS figure sits materially above it — which is what happens under a VM,
remote desktop or a virtual display, where `requestAnimationFrame` is not vsync-locked.

**Moving a task.** One task moves one month forward and is measured to quiescence. With
auto-scheduling enabled, dependent tasks are rescheduled: the remainder of the flat chain or
the edited project tree branch, including date rollups.

**Bulk edit — 100 updates, 100 deletions and 100 insertions.** Changes use each library's
documented batching mechanism where available and are measured to quiescence. The batch is
fixed so the result shows how its cost grows with chart size.

**Each update extends a leaf's end by two days and retitles it, leaving its start unchanged.**
With auto-scheduling on, the finish-to-start successor cascade is part of the timed work;
moving a task's start and end together is measured separately. DevExtreme's edit validation
is documented in [its configuration section](CONFIGURATION.md#devextreme-gantt).

The updates run from the last record of the band to the first. Every library reads a task's
current dates inside the loop and a dependency cascade runs downstream, so this order is what
hands every app the same inputs: a record is read while it still holds the dates the dataset
gave it, rather than the ones an earlier update in the same batch pushed it to.

**The shared generator chooses the batch records once for every library.** Leaves are numbered
`1..n`; the 3rd is moved, updates start at the 101st leaf, and deletions at the 501st. The
three bands are disjoint and exist at the smallest size.

In the flat shape, updates and deletions are consecutive leaves and insertions go under the
root. In the project tree, updates cover one project's leaves across ten work packages;
deletions remove the first half of each touched package, leaving children; insertions are
distributed round-robin across that project's packages.

Every library applies changes **in place** through its documented API, batching where possible.
A full dataset reload is not substituted: it discards scroll position, selection and open
editors and measures a different, smaller operation.

| Library | Mechanism | Repaints for 300 changes |
|---|---|---|
| DHTMLX | `gantt.batchUpdate(fn)`, with one `autoSchedule()` inside it when the mode is on | one |
| Bryntum | `Store.beginBatch()`/`endBatch()`, then one `commitAsync()` | one |
| Syncfusion | array `deleteRecord()` / `addRecord()`, `updateRecordByID()` per update | ~100 |
| DevExtreme | `beginUpdate()`/`endUpdate()` around imperative task calls | ~300 |
| Kendo UI | individual `dataSource` `update`/`remove`/`add` | one per change |

Only DHTMLX and Bryntum suspend rendering across a batch. DevExtreme's `beginUpdate()`/
`endUpdate()` defers option changes, not imperative task re-renders; Kendo exposes no client
render-suspend mechanism (`batch` concerns server transport); Syncfusion has no bulk update
counterpart. Kendo deletions also do not cascade to dependencies, so the test removes those
links explicitly.

Programmatic DHTMLX `updateTask()` leaves auto-scheduling to the caller. With the mode on, the
batch therefore ends with one `gantt.autoSchedule()` over the chart inside `batchUpdate()`;
that call is part of the timed step.

**Order within a cell.** Load → memory → scroll → reset scroll → move → bulk edit. Memory
is sampled immediately after the load so it reflects the loaded dataset rather than
scroll-induced DOM churn. Scroll position is reset before the move so every library
performs it against the same viewport, and that reset waits for the UI to go quiet again, so
the re-render of the first window is not billed to the move. Bulk edit runs last because it
is the only step that adds and removes tasks: every earlier metric sees a pristine dataset.


## A missing number is never a slow number

Several things can appear in a table cell instead of a measurement, and each is reported as
itself rather than as a figure:

| Marker | Meaning |
|---|---|
| `DNF` | the step exceeded the five-minute limit |
| `no-settle` | the step produced frames but the UI never went quiet inside that limit |
| `error` | a direct throw, page error, rejected promise or framework handoff failed the step; the message is recorded on the row |
| `skip` | not attempted, because every run at a smaller dataset failed at this step in this mode and shape, and the steps after it are measured on the chart it leaves |
| `unreached` | not attempted, because the run stopped at an earlier step at this size; the step that stopped it carries its own marker |
| `env` | the harness could not reach its own preview server — nothing about the library was measured, and the cell is one to re-run |
| `no-scroll` | the FPS step's scroll moved nothing, so the frames counted would have been idle ones; the steps after it were measured as usual |
| `***` | the library has no auto-scheduling feature, so the mode does not apply to it |
| `—` | not measured in this run |

Each marker describes one step and no other. A step that failed carries its own failure; a step
the run stopped short of carries `unreached`, or `skip` where the cascade below had already
excluded it — so a load timeout is `DNF` at load and never the bulk edit's result. Markers are
never recorded as large values. If `requestAnimationFrame` is throttled, the settle criterion is
unreachable and the step reports `no-settle`.

**A failed step affects only its own metric.** Medians use every completed result, so a bulk
edit timeout does not erase the load, first-paint, memory, scroll or move figures.

**Larger datasets are skipped after a total failure, including later steps.** Steps run in the
fixed order load → scroll → move → bulk edit on one page, so each figure has the same prior
state (including a scroll and reset before move). If every run fails at one size, that step and
later steps are skipped at larger sizes for the same library, mode and shape; earlier metrics
continue to publish.

If load fails in every run, the whole larger cell is skipped. Skipping is per mode and shape,
requires a clean sweep rather than one crash, and assumes the failure scales with dataset size.

Skipped cells are footnoted as not attempted and name the failed step and size; they are not
blank or conflated with measured failures. `--no-skip` attempts every cell.


## Runs, medians, and the shipped evidence

Each cell runs N times and publishes the **median of runs that produced a figure**, per metric.
Every run starts a fresh browser and chart instance. Partial failures use the remaining runs and
show their count in `results.csv`'s `samples` column; every run remains in `runs.csv`. Three
samples do not support useful percentile figures.

### Practical equivalence

Exact figures remain in every table and CSV. Two positive measurements are **practically
equivalent when they are within 25% of each other** (the exact value is defined in
[`bench/config.mjs`](bench/config.mjs)), defined symmetrically as
`larger / smaller <= 1.25`.

Differences within that band are described as comparable rather than ranked. The threshold is
an interpretation rule, not statistical significance, and does not alter measured values.

Everything a run produces lands in `raw-results/<machine-id>/`:

| File | What it holds |
|---|---|
| `results.csv` | one row per cell with the median of each metric, plus an environment block |
| `runs.csv` | every individual fresh-browser run used to calculate the medians |
| `env.json` | the environment block per measuring session, as JSON |
| `tables.md` | the medians rendered as markdown — generated, never hand-edited |

There is one directory per machine. Rows are upserted by (library, shape, size, mode), so a
disturbed cell can be re-measured independently; rows retain their measuring session.

**Versions are read, not typed.** Each row records the installed library version and harness
version. A harness change that can move a figure makes rounds **not comparable**; `summary.json`
records the generating and contributing harness versions.

From those CSVs the round document, charts, `summary.json` under
[`reports/<version>/`](reports/), frozen evidence and the results block in [`README.md`](README.md)
are generated. A round is a snapshot; corrections go into the live store and appear in the next
round rather than editing published evidence. See [`PUBLISHING.md`](PUBLISHING.md).


## Running it yourself

```
npm ci                                        # playwright
npm run setup                                 # pinned Chromium + every app's dependencies
npm run check                                 # what is already measured, and by what
npm run bench                                 # the full matrix, into raw-results/
```

Expect hours, dominated by the 50 000 and 100 000 cells; a failure costs the five-minute limit.
`npm run bench:quick` is a three-size pre-flight and `npm run bench:smoke` checks the harness in
under a minute using `raw-results/smoke/`. `--lib`,
`--shape`, `--size` and `--mode` filter the matrix, and a filtered run merges into the
machine's existing results rather than replacing them. `--lib` reaches any app in
[`apps.json`](apps.json), including one this round does not measure: those rows are
stored beside the others, and the published documents, which are generated from
[`round-apps.json`](round-apps.json), leave them there.

`npm run check` reports the harness/library versions, dataset shapes and missing cells already
in the store; `bench` prints the same report before building.

Each app is also an interactive `npm run dev` demo for checking hierarchy, expansion and
scheduling before publication.

### Machine prerequisites

**The machine must stay awake, unlocked and displaying for the whole run.** Chromium can drop
`requestAnimationFrame` to roughly one frame per second when it becomes non-visible, causing
timed steps to cap out; the harness flags do not prevent this.

The runner spawns a process-scoped inhibitor where the platform has one, prints what is left to
do at startup, and records whether it held in the environment block:

| Platform | Mechanism | Covers |
|---|---|---|
| macOS | `caffeinate -dims` | display sleep, idle, disk, system sleep |
| Linux | `systemd-inhibit` | idle, sleep, lid switch — **not** screensaver, DPMS or lock |
| Windows | none available unelevated; the runner warns and prints the `powercfg` commands | nothing |

Each is released when the runner exits. A Linux `SIGKILL` leaves the `systemd-inhibit` child
alive until it is killed. Screen blanking and session lock remain the operator's responsibility:

```
# Linux, restored afterwards by whoever set them
xset s off -dpms                                         # X11
gsettings set org.gnome.desktop.session idle-delay 0     # GNOME, also Wayland
gsettings set org.gnome.desktop.screensaver lock-enabled false

# Windows, before a long run — and disable the lock-screen timeout
powercfg /change monitor-timeout-ac 0
powercfg /change standby-timeout-ac 0
```


## What this measurement cannot see

- **FPS depends on a real display.** Under a VM, remote desktop or a virtual display,
  `requestAnimationFrame` is not vsync-locked and the column is meaningless. The runner
  measures the machine's own refresh rate and flags figures above it, but a machine that is
  merely *wrong* rather than unlocked will not trigger that. FPS figures from two machines
  with different refresh rates are not directly comparable either, which is why the refresh
  rate is published in the environment block.
- **FPS counts frames, not how much content was painted in them.** Every component receives the
  same 100-step scroll, but a component that defers some row rendering until the scroll stops
  does less visible work per frame than one that keeps its rows current throughout the motion.
  The metric does not distinguish those behaviours.
- **A mid-run environmental change is caught only sometimes.** Sleep, blanking and lock are
  prevented where the platform allows it, and anything that stops the UI going quiet is
  excluded by the settle cap. Subtler degradation — thermal throttling, a background build —
  passes through. Because libraries run in contiguous blocks, such an event shows up as a
  positionally correlated block of anomalous cells rather than as one plausible wrong
  number, which is what makes it noticeable by eye. There is no per-cell environment
  monitoring, deliberately: aborting a cell mid-run would turn a data problem into a
  scheduling problem with no way to resume.
- **Memory is the JS heap only.** `performance.memory` is Chromium-only and excludes
  detached DOM and GPU memory, so a library rendering more DOM per row is under-penalised
  relative to what a task manager would show.
- **One browser.** Everything here is Chromium. Nothing in the harness prevents Firefox or
  WebKit, but the memory metric has no equivalent there.
- **These timings are not comparable to hand-collected numbers**, including older DHTMLX
  benchmark tables. A stopwatch around the call and a wait for quiescence measure different
  things, and the two must not be mixed in one document.
- **Correctness is checked by eye, not asserted by the harness.** Before publication, each app
  must be inspected interactively at the smallest dataset size in both shapes: the hierarchy and
  expansion state must match, and auto-scheduling must visibly cascade along the flat chain and
  within one project in the tree. This establishes the behavior only at a size a person can
  inspect. The harness does not prove that the same work remains correct at the largest sizes.
