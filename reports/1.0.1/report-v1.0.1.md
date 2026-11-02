# JavaScript Gantt chart performance — round v1.0.1

## Libraries measured

This round compares 5 vanilla JavaScript Gantt components:

<!-- BENCH:LIBRARIES -->

- [**DHTMLX Gantt** v10.0.3](https://dhtmlx.com/docs/products/dhtmlxGantt/)
- [**Bryntum Gantt** v7.3.8](https://www.bryntum.com/products/gantt/)
- [**DevExtreme Gantt** v26.1.6](https://js.devexpress.com/jQuery/Documentation/Guide/UI_Components/Gantt/Overview/)
- [**Kendo UI Gantt** v2026.3.1015](https://www.telerik.com/kendo-jquery-ui/gantt)
- [**Syncfusion Gantt** v35.1.41](https://ej2.syncfusion.com/documentation/gantt/overview)

<!-- /BENCH:LIBRARIES -->

This repository's harness produced these measurements. See
[`METHODOLOGY.md`](../../METHODOLOGY.md) for measurement methods and
[`CONFIGURATION.md`](../../CONFIGURATION.md) for workloads and settings.

<!-- BENCH:MACHINE -->

Machine MacBook Air M1 (`Apple-M1-mac`) — Apple M1, RAM 16 GB, darwin 24.6.0, Chromium 151.0.7922.34, 60 Hz display. Each figure is the median of the runs that produced one, out of 3 independent fresh-browser runs of every test; where a figure came from fewer, the count is printed beside it. Every individual run is in `runs.csv`. The harness kept the machine awake for the duration of the run.

<!-- /BENCH:MACHINE -->

This round's frozen evidence includes source CSVs in [`raw-results/`](raw-results/) and
machine-readable results in [`summary.json`](summary.json). The repository's
[`raw-results/`](../../raw-results/) holds the live measurements.

**Disclosure:** DHTMLX publishes this benchmark and is one of the 5 components
measured. Every table and chart below is generated from the reference machine's CSVs. Figures in
the narrative are drawn from those tables or the frozen raw results.

Headlines, the conclusion under each test and round-specific limitations are drafted against
[`BENCHMARK_REPORT_EDITOR.md`](../../bench/BENCHMARK_REPORT_EDITOR.md).

## Fastest component per test

<!-- BENCH:WINNERS -->

**Project tree dataset, auto-scheduling disabled**

| Test                       | 1 000 tasks                              | 10 000 tasks                  | 100 000 tasks                 |
|----------------------------|------------------------------------------|-------------------------------|-------------------------------|
| Time to ready (TTR)        | DHTMLX                                   | DHTMLX                        | DHTMLX                        |
| Time to first paint (TTFP) | DHTMLX                                   | DHTMLX                        | DHTMLX                        |
| Memory usage               | DHTMLX                                   | DHTMLX                        | DHTMLX                        |
| Scrolling FPS              | DHTMLX / Bryntum / Kendo UI / Syncfusion | DHTMLX / Bryntum / Syncfusion | DHTMLX / Syncfusion / Bryntum |
| Moving a task              | DHTMLX                                   | DHTMLX                        | DHTMLX                        |
| Bulk edit                  | DHTMLX                                   | DHTMLX                        | DHTMLX                        |

**Project tree dataset, auto-scheduling enabled**

| Test                       | 1 000 tasks                   | 10 000 tasks                  | 100 000 tasks                 |
|----------------------------|-------------------------------|-------------------------------|-------------------------------|
| Time to ready (TTR)        | DHTMLX                        | DHTMLX                        | DHTMLX                        |
| Time to first paint (TTFP) | DHTMLX                        | DHTMLX                        | DHTMLX                        |
| Memory usage               | DHTMLX                        | DevExtreme / DHTMLX           | DHTMLX                        |
| Scrolling FPS              | DHTMLX / Bryntum / Syncfusion | DHTMLX / Bryntum / Syncfusion | DHTMLX / Syncfusion / Bryntum |
| Moving a task              | DHTMLX                        | DHTMLX                        | DHTMLX                        |
| Bulk edit                  | DHTMLX                        | DHTMLX                        | DHTMLX                        |

<!-- /BENCH:WINNERS -->

The table names the best median and every component within 25% of it.
Multiple names indicate comparable results. *Nobody finished* means no component completed that
test at that size.

It shows one shape at selected sizes; each test below covers both shapes at every measured size.

## Headlines

> **TODO** — write the Headlines following
> [`BENCHMARK_REPORT_EDITOR.md`](../../bench/BENCHMARK_REPORT_EDITOR.md#headlines). Replace this
> entire block.

---

## What this measures, and what it does not

The round covers two synthetic workloads with 1 000 to 100 000 tasks in a fixed 1600 × 900 viewport.
It measures loading, painting, memory, scrolling and editing with auto-scheduling off and on;
workloads and settings are in [`CONFIGURATION.md`](../../CONFIGURATION.md).

These results do not determine which component suits your project. Feature breadth, API quality,
integration, documentation, support and licence terms are outside the benchmark.

## How to read the numbers

- **Compare components within the same dataset shape.** The flat chain and project tree are
  separate workloads, not a controlled hierarchy experiment.
- **Time to ready (TTR)** stops when the UI goes quiet; **time to first paint (TTFP)** stops at
  the first frame with rows on screen.
- **A missing number is never a slow number.** `DNF`, `no-settle` and `error` describe a failure
  at that test; `skip` and `unreached` mean it was never attempted at that size; `***` marks an
  unsupported mode. The legend below defines each marker in full.
- **Absolute figures matter as much as ordering.** Loading 100 000 tasks in tens of seconds
  is still slow, even for the fastest component.
- **Differences within 25% are treated as comparable.** Exact figures
  remain in the tables, but components inside that band belong to the same fastest group.
- **FPS is bounded by the display.** A figure at or near the reference refresh rate is a pass;
  the display cannot distinguish components that all keep pace.
- **Each chart plots the table beneath it.** Each metric's four charts use the same axis ranges
  for comparison across shapes and modes. Time and memory use logarithmic axes; FPS uses a linear
  axis from zero, with the display's refresh rate marked as its ceiling. Gaps indicate missing
  results; the tables explain why.

---

## Results

<!-- BENCH:SHAPES -->

### The two dataset shapes

Every metric is measured on both, at every size and in both auto-scheduling modes. Both are generated by one function from one parameter, and both hold exactly as many records as the size says — so at a given size the two shapes put the same number of rows on screen.

**Flat chain.** One summary task holds every other task as a leaf directly under it, and each leaf is linked finish-to-start to the next, so the dataset is a single dependency chain running through all of it. With auto-scheduling on, moving one task reschedules every task after it, and every edit rolls up through a parent with as many children as the chart has rows. It is a stress test of both engines rather than a project shape anyone ships.

**Project tree.** A four-level project portfolio: the portfolio root, its projects, ten work packages per project and ten tasks per work package, which leaves about 90% of the records leaves at every size. Fanout inside a project is constant, so the shape stays the same from the smallest dataset to the largest and it is the number of projects that grows. Leaves are chained inside their work package and the last leaf of one package is linked to the first of the next in the same project, so no dependency crosses a project boundary and a cascade is bounded by one project. Every summary is loaded expanded, so the whole tree is on screen.

| Size    | Shape        | Summary rows | Leaves | Links  |
|---------|--------------|--------------|--------|--------|
| 1 000   | Flat chain   | 1            | 999    | 998    |
| 1 000   | Project tree | 100          | 900    | 891    |
| 5 000   | Flat chain   | 1            | 4 999  | 4 998  |
| 5 000   | Project tree | 498          | 4 502  | 4 456  |
| 10 000  | Flat chain   | 1            | 9 999  | 9 998  |
| 10 000  | Project tree | 993          | 9 007  | 8 916  |
| 50 000  | Flat chain   | 1            | 49 999 | 49 998 |
| 50 000  | Project tree | 4 957        | 45 043 | 44 592 |
| 100 000 | Flat chain   | 1            | 99 999 | 99 998 |
| 100 000 | Project tree | 9 911        | 90 089 | 89 188 |

Leaf count and link count differ between the shapes by about a tenth, which is the one quantity that cannot be held equal alongside equal record counts — so the two shapes are two workloads rather than one experiment with hierarchy as its variable, and a difference between a library's two rows is not attributable to hierarchy alone. Comparisons are between libraries within a shape.

<!-- /BENCH:SHAPES -->

<!-- BENCH:MARKERS -->

### What the markers in the tables mean

- `DNF` — Test execution was aborted due to timeout exceeded. Marks the step it happened at, and no other: the steps after it were never attempted at this size.
- `mixed` — The runs behind this figure failed for different reasons — an in-page error in one and a timeout in another, say — so no single outcome describes it. Each run's own note is in `runs.csv`.
- `***` — Library does not provide auto-scheduling logic.
- `unreached` — Never attempted. Every test of a run shares one chart in a fixed order — load, scroll, move, bulk edit — and at this size the run stopped at a step before this one, which carries the marker that says why. Not a measurement of this test.
- `skip` — Not attempted. Every run at a smaller dataset in this mode and shape failed at this step, and each step is measured on the chart the ones before it left — so the step and everything after it are skipped at every larger size, while the steps before it were measured and their figures are in this row. The list below the tables names the step and the size each skip was inferred from.
- `error` — Test execution was aborted due to an in-page error. Marks the step it happened at, and no other: the steps after it were never attempted at this size.

<!-- /BENCH:MARKERS -->

### Test: Time to ready (TTR)

<!-- BENCH:TEST:ttr -->

Loads the chart with the given number of tasks and the links between them, and measures the time until loading, scheduling and rendering have all finished and the chart is usable. This is time to *ready*, not time to first paint: the clock stops when the UI goes quiet, so work a library defers to later frames is counted.

#### Auto-scheduling — disabled

![Time to ready (TTR), Flat chain dataset, auto-scheduling off](charts/ttr-off-flat.svg)
![Time to ready (TTR), Project tree dataset, auto-scheduling off](charts/ttr-off-tree.svg)

**Results table: Time to ready (TTR) — Flat chain and Project tree, auto-scheduling off.**

Measured in milliseconds — lower is better.

| Library                     | Shape        | 1000 | 5000 | 10k   | 50k    | 100k  |
|-----------------------------|--------------|------|------|-------|--------|-------|
| DHTMLX Gantt v10.0.3        | Flat chain   | 58   | 90   | 126   | 411    | 743   |
| DHTMLX Gantt v10.0.3        | Project tree | 58   | 97   | 143   | 519    | 1005  |
| Bryntum Gantt v7.3.8        | Flat chain   | 612  | 2088 | 4010  | 22279  | 58660 |
| Bryntum Gantt v7.3.8        | Project tree | 619  | 2065 | 3921  | 21270  | 55446 |
| DevExtreme Gantt v26.1.6    | Flat chain   | 297  | 3762 | 13383 | 283261 | DNF   |
| DevExtreme Gantt v26.1.6    | Project tree | 274  | 3347 | 11664 | 250083 | DNF   |
| Kendo UI Gantt v2026.3.1015 | Flat chain   | 198  | 1487 | 4259  | 80313  | mixed |
| Kendo UI Gantt v2026.3.1015 | Project tree | 204  | 1482 | 4403  | 85153  | DNF   |
| Syncfusion Gantt v35.1.41   | Flat chain   | 234  | 627  | 1146  | 6979   | 17278 |
| Syncfusion Gantt v35.1.41   | Project tree | 297  | 942  | 1909  | 21542  | 68623 |

#### Auto-scheduling — enabled

![Time to ready (TTR), Flat chain dataset, auto-scheduling on](charts/ttr-on-flat.svg)
![Time to ready (TTR), Project tree dataset, auto-scheduling on](charts/ttr-on-tree.svg)

**Results table: Time to ready (TTR) — Flat chain and Project tree, auto-scheduling on.**

Measured in milliseconds — lower is better.

| Library                     | Shape        | 1000 | 5000 | 10k   | 50k    | 100k  |
|-----------------------------|--------------|------|------|-------|--------|-------|
| DHTMLX Gantt v10.0.3        | Flat chain   | 86   | 184  | 303   | 1151   | 2263  |
| DHTMLX Gantt v10.0.3        | Project tree | 93   | 198  | 300   | 1227   | 2424  |
| Bryntum Gantt v7.3.8        | Flat chain   | 712  | 3013 | 6683  | 86536  | DNF   |
| Bryntum Gantt v7.3.8        | Project tree | 689  | 2373 | 4520  | 24314  | 66969 |
| DevExtreme Gantt v26.1.6    | Flat chain   | 298  | 3765 | 13360 | 282943 | DNF   |
| DevExtreme Gantt v26.1.6    | Project tree | 275  | 3343 | 11697 | 248351 | DNF   |
| Kendo UI Gantt v2026.3.1015 | Flat chain   | ***  | ***  | ***   | ***    | ***   |
| Kendo UI Gantt v2026.3.1015 | Project tree | ***  | ***  | ***   | ***    | ***   |
| Syncfusion Gantt v35.1.41   | Flat chain   | 236  | 621  | 1115  | 5623   | 11710 |
| Syncfusion Gantt v35.1.41   | Project tree | 303  | 996  | 1938  | 20740  | 64449 |

<!-- /BENCH:TEST:ttr -->

#### What these results show

> **TODO** — interpret the Time to ready (TTR) tables above following
> [`BENCHMARK_REPORT_EDITOR.md`](../../bench/BENCHMARK_REPORT_EDITOR.md#per-test-conclusions). Replace this entire
> block, keeping the heading.

### Test: Time to first paint (TTFP)

<!-- BENCH:TEST:ttfp -->

The same load, measured to the first frame that has rows on screen rather than to the last — any rows, so in the project tree the rows that stop the clock may be summary rows. Time to ready is the primary figure because it is the point at which the chart is usable, but it is also the measurement that most penalises an engine for deferring work — so the figure that credits deferring is published beside it. A library that paints early and finishes late scores well here and badly above; one that does all its work before painting reports the same figure for both.

#### Auto-scheduling — disabled

![Time to first paint (TTFP), Flat chain dataset, auto-scheduling off](charts/ttfp-off-flat.svg)
![Time to first paint (TTFP), Project tree dataset, auto-scheduling off](charts/ttfp-off-tree.svg)

**Results table: Time to first paint (TTFP) — Flat chain and Project tree, auto-scheduling off.**

Measured in milliseconds — lower is better.

| Library                     | Shape        | 1000 | 5000 | 10k  | 50k    | 100k  |
|-----------------------------|--------------|------|------|------|--------|-------|
| DHTMLX Gantt v10.0.3        | Flat chain   | 58   | 90   | 126  | 411    | 743   |
| DHTMLX Gantt v10.0.3        | Project tree | 58   | 97   | 143  | 519    | 1005  |
| Bryntum Gantt v7.3.8        | Flat chain   | 188  | 389  | 655  | 2534   | 4848  |
| Bryntum Gantt v7.3.8        | Project tree | 191  | 390  | 652  | 2568   | 4813  |
| DevExtreme Gantt v26.1.6    | Flat chain   | 225  | 1929 | 6594 | 140480 | DNF   |
| DevExtreme Gantt v26.1.6    | Project tree | 210  | 1672 | 5611 | 117554 | DNF   |
| Kendo UI Gantt v2026.3.1015 | Flat chain   | 198  | 1426 | 4068 | 79371  | mixed |
| Kendo UI Gantt v2026.3.1015 | Project tree | 204  | 1368 | 4207 | 84165  | DNF   |
| Syncfusion Gantt v35.1.41   | Flat chain   | 234  | 627  | 1146 | 6979   | 17278 |
| Syncfusion Gantt v35.1.41   | Project tree | 297  | 942  | 1909 | 21542  | 68623 |

#### Auto-scheduling — enabled

![Time to first paint (TTFP), Flat chain dataset, auto-scheduling on](charts/ttfp-on-flat.svg)
![Time to first paint (TTFP), Project tree dataset, auto-scheduling on](charts/ttfp-on-tree.svg)

**Results table: Time to first paint (TTFP) — Flat chain and Project tree, auto-scheduling on.**

Measured in milliseconds — lower is better.

| Library                     | Shape        | 1000 | 5000 | 10k  | 50k    | 100k  |
|-----------------------------|--------------|------|------|------|--------|-------|
| DHTMLX Gantt v10.0.3        | Flat chain   | 86   | 184  | 303  | 1151   | 2263  |
| DHTMLX Gantt v10.0.3        | Project tree | 93   | 198  | 300  | 1227   | 2424  |
| Bryntum Gantt v7.3.8        | Flat chain   | 188  | 399  | 655  | 2551   | DNF   |
| Bryntum Gantt v7.3.8        | Project tree | 192  | 393  | 655  | 2551   | 4855  |
| DevExtreme Gantt v26.1.6    | Flat chain   | 226  | 1933 | 6599 | 140275 | DNF   |
| DevExtreme Gantt v26.1.6    | Project tree | 210  | 1672 | 5630 | 117305 | DNF   |
| Kendo UI Gantt v2026.3.1015 | Flat chain   | ***  | ***  | ***  | ***    | ***   |
| Kendo UI Gantt v2026.3.1015 | Project tree | ***  | ***  | ***  | ***    | ***   |
| Syncfusion Gantt v35.1.41   | Flat chain   | 236  | 621  | 1115 | 5623   | 11710 |
| Syncfusion Gantt v35.1.41   | Project tree | 303  | 996  | 1938 | 20740  | 64449 |

<!-- /BENCH:TEST:ttfp -->

#### What these results show

> **TODO** — interpret the Time to first paint (TTFP) tables above following
> [`BENCHMARK_REPORT_EDITOR.md`](../../bench/BENCHMARK_REPORT_EDITOR.md#per-test-conclusions). Replace this entire
> block, keeping the heading.

### Test: Memory usage

<!-- BENCH:TEST:memory -->

JavaScript heap still retained once the dataset is loaded, sampled after a forced garbage collection so the figure is live data rather than uncollected garbage.

#### Auto-scheduling — disabled

![Memory usage, Flat chain dataset, auto-scheduling off](charts/memory-off-flat.svg)
![Memory usage, Project tree dataset, auto-scheduling off](charts/memory-off-tree.svg)

**Results table: Memory usage — Flat chain and Project tree, auto-scheduling off.**

Measured in megabytes — lower is better.

| Library                     | Shape        | 1000 | 5000 | 10k | 50k  | 100k      |
|-----------------------------|--------------|------|------|-----|------|-----------|
| DHTMLX Gantt v10.0.3        | Flat chain   | 5    | 8    | 10  | 33   | 62        |
| DHTMLX Gantt v10.0.3        | Project tree | 5    | 8    | 10  | 33   | 63        |
| Bryntum Gantt v7.3.8        | Flat chain   | 57   | 182  | 339 | 1632 | 3238      |
| Bryntum Gantt v7.3.8        | Project tree | 57   | 182  | 338 | 1631 | 3235      |
| DevExtreme Gantt v26.1.6    | Flat chain   | 13   | 17   | 22  | 62   | unreached |
| DevExtreme Gantt v26.1.6    | Project tree | 13   | 17   | 22  | 61   | unreached |
| Kendo UI Gantt v2026.3.1015 | Flat chain   | 27   | 40   | 56  | 186  | unreached |
| Kendo UI Gantt v2026.3.1015 | Project tree | 27   | 41   | 57  | 191  | unreached |
| Syncfusion Gantt v35.1.41   | Flat chain   | 21   | 43   | 71  | 290  | 564       |
| Syncfusion Gantt v35.1.41   | Project tree | 23   | 53   | 89  | 382  | 749       |

#### Auto-scheduling — enabled

![Memory usage, Flat chain dataset, auto-scheduling on](charts/memory-on-flat.svg)
![Memory usage, Project tree dataset, auto-scheduling on](charts/memory-on-tree.svg)

**Results table: Memory usage — Flat chain and Project tree, auto-scheduling on.**

Measured in megabytes — lower is better.

| Library                     | Shape        | 1000 | 5000 | 10k | 50k  | 100k      |
|-----------------------------|--------------|------|------|-----|------|-----------|
| DHTMLX Gantt v10.0.3        | Flat chain   | 7    | 14   | 22  | 86   | 167       |
| DHTMLX Gantt v10.0.3        | Project tree | 7    | 14   | 23  | 93   | 181       |
| Bryntum Gantt v7.3.8        | Flat chain   | 59   | 189  | 351 | 1696 | unreached |
| Bryntum Gantt v7.3.8        | Project tree | 59   | 187  | 349 | 1680 | 3333      |
| DevExtreme Gantt v26.1.6    | Flat chain   | 13   | 17   | 22  | 62   | unreached |
| DevExtreme Gantt v26.1.6    | Project tree | 13   | 17   | 22  | 61   | unreached |
| Kendo UI Gantt v2026.3.1015 | Flat chain   | ***  | ***  | *** | ***  | ***       |
| Kendo UI Gantt v2026.3.1015 | Project tree | ***  | ***  | *** | ***  | ***       |
| Syncfusion Gantt v35.1.41   | Flat chain   | 21   | 43   | 71  | 293  | 571       |
| Syncfusion Gantt v35.1.41   | Project tree | 23   | 53   | 90  | 385  | 755       |

<!-- /BENCH:TEST:memory -->

#### What these results show

> **TODO** — interpret the Memory usage tables above following
> [`BENCHMARK_REPORT_EDITOR.md`](../../bench/BENCHMARK_REPORT_EDITOR.md#per-test-conclusions). Replace this entire
> block, keeping the heading.

### Test: Scrolling FPS

<!-- BENCH:TEST:fps -->

Scrolls the chart from the first row to the last in 100 equal steps, one per animation frame, and counts the frames actually rendered during the scroll. Every library is given the identical scroll — same number of steps, same fraction of the way down per step — so the only thing that varies is how long it takes to render it. The browser cannot draw faster than the display refreshes, so the measuring machine's refresh rate in the environment block is a perfect score rather than a ceiling to beat. The worst one-second stretch of each scroll is recorded as `fpsMin` in `results.csv`.

#### Auto-scheduling — disabled

![Scrolling FPS, Flat chain dataset, auto-scheduling off](charts/fps-off-flat.svg)
![Scrolling FPS, Project tree dataset, auto-scheduling off](charts/fps-off-tree.svg)

**Results table: Scrolling FPS — Flat chain and Project tree, auto-scheduling off.**

Measured in frames per second — higher is better.

| Library                     | Shape        | 1000 | 5000 | 10k | 50k | 100k      |
|-----------------------------|--------------|------|------|-----|-----|-----------|
| DHTMLX Gantt v10.0.3        | Flat chain   | 60   | 60   | 60  | 60  | 60        |
| DHTMLX Gantt v10.0.3        | Project tree | 60   | 60   | 60  | 60  | 60        |
| Bryntum Gantt v7.3.8        | Flat chain   | 60   | 60   | 60  | 60  | 58        |
| Bryntum Gantt v7.3.8        | Project tree | 60   | 59   | 60  | 60  | 58        |
| DevExtreme Gantt v26.1.6    | Flat chain   | 23   | 1    | 0   | DNF | skip      |
| DevExtreme Gantt v26.1.6    | Project tree | 25   | 2    | 0   | DNF | skip      |
| Kendo UI Gantt v2026.3.1015 | Flat chain   | 61   | 60   | 33  | 6   | unreached |
| Kendo UI Gantt v2026.3.1015 | Project tree | 60   | 59   | 32  | 6   | unreached |
| Syncfusion Gantt v35.1.41   | Flat chain   | 60   | 60   | 60  | 60  | 60        |
| Syncfusion Gantt v35.1.41   | Project tree | 60   | 60   | 60  | 60  | 60        |

#### Auto-scheduling — enabled

![Scrolling FPS, Flat chain dataset, auto-scheduling on](charts/fps-on-flat.svg)
![Scrolling FPS, Project tree dataset, auto-scheduling on](charts/fps-on-tree.svg)

**Results table: Scrolling FPS — Flat chain and Project tree, auto-scheduling on.**

Measured in frames per second — higher is better.

| Library                     | Shape        | 1000 | 5000 | 10k | 50k | 100k      |
|-----------------------------|--------------|------|------|-----|-----|-----------|
| DHTMLX Gantt v10.0.3        | Flat chain   | 60   | 60   | 60  | 60  | 60        |
| DHTMLX Gantt v10.0.3        | Project tree | 60   | 60   | 60  | 60  | 60        |
| Bryntum Gantt v7.3.8        | Flat chain   | 60   | 60   | 60  | 60  | unreached |
| Bryntum Gantt v7.3.8        | Project tree | 60   | 60   | 60  | 60  | 58        |
| DevExtreme Gantt v26.1.6    | Flat chain   | 23   | 1    | 0   | DNF | skip      |
| DevExtreme Gantt v26.1.6    | Project tree | 25   | 2    | 0   | DNF | skip      |
| Kendo UI Gantt v2026.3.1015 | Flat chain   | ***  | ***  | *** | *** | ***       |
| Kendo UI Gantt v2026.3.1015 | Project tree | ***  | ***  | *** | *** | ***       |
| Syncfusion Gantt v35.1.41   | Flat chain   | 60   | 60   | 60  | 60  | 60        |
| Syncfusion Gantt v35.1.41   | Project tree | 60   | 60   | 60  | 60  | 60        |

<!-- /BENCH:TEST:fps -->

#### What these results show

> **TODO** — interpret the Scrolling FPS tables above following
> [`BENCHMARK_REPORT_EDITOR.md`](../../bench/BENCHMARK_REPORT_EDITOR.md#per-test-conclusions). Replace this entire
> block, keeping the heading.

### Test: Moving a task

<!-- BENCH:TEST:move -->

Moves a single task one month forward — the most common edit in a Gantt chart — and measures the time until the chart has finished reacting, including every dependent task rescheduled when auto-scheduling is enabled.

#### Auto-scheduling — disabled

![Moving a task, Flat chain dataset, auto-scheduling off](charts/move-off-flat.svg)
![Moving a task, Project tree dataset, auto-scheduling off](charts/move-off-tree.svg)

**Results table: Moving a task — Flat chain and Project tree, auto-scheduling off.**

Measured in milliseconds — lower is better.

| Library                     | Shape        | 1000 | 5000 | 10k   | 50k       | 100k |
|-----------------------------|--------------|------|------|-------|-----------|------|
| DHTMLX Gantt v10.0.3        | Flat chain   | 15   | 32   | 49    | 160       | 318  |
| DHTMLX Gantt v10.0.3        | Project tree | 15   | 26   | 37    | 136       | 255  |
| Bryntum Gantt v7.3.8        | Flat chain   | 86   | 212  | 363   | 2422      | 5799 |
| Bryntum Gantt v7.3.8        | Project tree | 92   | 255  | 436   | 2581      | 6638 |
| DevExtreme Gantt v26.1.6    | Flat chain   | 143  | 1669 | 6709  | unreached | skip |
| DevExtreme Gantt v26.1.6    | Project tree | 146  | 1539 | 6403  | unreached | skip |
| Kendo UI Gantt v2026.3.1015 | Flat chain   | 364  | 5364 | 19425 | DNF       | skip |
| Kendo UI Gantt v2026.3.1015 | Project tree | 540  | 7940 | 29194 | DNF       | skip |
| Syncfusion Gantt v35.1.41   | Flat chain   | 85   | 230  | 378   | 1755      | 3599 |
| Syncfusion Gantt v35.1.41   | Project tree | 89   | 224  | 367   | 1648      | 3376 |

#### Auto-scheduling — enabled

![Moving a task, Flat chain dataset, auto-scheduling on](charts/move-on-flat.svg)
![Moving a task, Project tree dataset, auto-scheduling on](charts/move-on-tree.svg)

**Results table: Moving a task — Flat chain and Project tree, auto-scheduling on.**

Measured in milliseconds — lower is better.

| Library                     | Shape        | 1000  | 5000  | 10k   | 50k       | 100k      |
|-----------------------------|--------------|-------|-------|-------|-----------|-----------|
| DHTMLX Gantt v10.0.3        | Flat chain   | 56    | 134   | 237   | 945       | 1883      |
| DHTMLX Gantt v10.0.3        | Project tree | 45    | 87    | 130   | 501       | 977       |
| Bryntum Gantt v7.3.8        | Flat chain   | 350   | 1421  | 2748  | 15049     | unreached |
| Bryntum Gantt v7.3.8        | Project tree | 271   | 937   | 1815  | 9834      | error     |
| DevExtreme Gantt v26.1.6    | Flat chain   | 16137 | error | skip  | skip      | skip      |
| DevExtreme Gantt v26.1.6    | Project tree | 2580  | 12608 | 31121 | unreached | skip      |
| Kendo UI Gantt v2026.3.1015 | Flat chain   | ***   | ***   | ***   | ***       | ***       |
| Kendo UI Gantt v2026.3.1015 | Project tree | ***   | ***   | ***   | ***       | ***       |
| Syncfusion Gantt v35.1.41   | Flat chain   | 212   | error | skip  | skip      | skip      |
| Syncfusion Gantt v35.1.41   | Project tree | 195   | 357   | 624   | 3278      | 8850      |

<!-- /BENCH:TEST:move -->

#### What these results show

> **TODO** — interpret the Moving a task tables above following
> [`BENCHMARK_REPORT_EDITOR.md`](../../bench/BENCHMARK_REPORT_EDITOR.md#per-test-conclusions). Replace this entire
> block, keeping the heading.

### Test: Bulk edit

<!-- BENCH:TEST:bulk -->

Applies 100 task updates, 100 deletions and 100 insertions as one batch, and measures the time until the chart has finished reacting. This is the shape of a server sync, an imported plan or an undone bulk operation. Every library applies the changes in place through its own documented API, using its batching mechanism where it has one — see the note under the tables for what that means for the components that do not.

#### Auto-scheduling — disabled

![Bulk edit, Flat chain dataset, auto-scheduling off](charts/bulk-off-flat.svg)
![Bulk edit, Project tree dataset, auto-scheduling off](charts/bulk-off-tree.svg)

**Results table: Bulk edit — Flat chain and Project tree, auto-scheduling off.**

Measured in milliseconds — lower is better.

| Library                     | Shape        | 1000   | 5000 | 10k   | 50k   | 100k   |
|-----------------------------|--------------|--------|------|-------|-------|--------|
| DHTMLX Gantt v10.0.3        | Flat chain   | 42     | 51   | 67    | 216   | 391    |
| DHTMLX Gantt v10.0.3        | Project tree | 44     | 53   | 66    | 223   | 408    |
| Bryntum Gantt v7.3.8        | Flat chain   | 235    | 664  | 1235  | 6304  | 20678  |
| Bryntum Gantt v7.3.8        | Project tree | 209    | 392  | 634   | 2971  | 10529  |
| DevExtreme Gantt v26.1.6    | Flat chain   | 51636  | DNF  | skip  | skip  | skip   |
| DevExtreme Gantt v26.1.6    | Project tree | 49455  | DNF  | skip  | skip  | skip   |
| Kendo UI Gantt v2026.3.1015 | Flat chain   | DNF    | skip | skip  | skip  | skip   |
| Kendo UI Gantt v2026.3.1015 | Project tree | 242039 | DNF  | skip  | skip  | skip   |
| Syncfusion Gantt v35.1.41   | Flat chain   | 3028   | 7833 | 14552 | 91914 | 204301 |
| Syncfusion Gantt v35.1.41   | Project tree | 2973   | 6443 | 11385 | 70255 | 158050 |

#### Auto-scheduling — enabled

![Bulk edit, Flat chain dataset, auto-scheduling on](charts/bulk-on-flat.svg)
![Bulk edit, Project tree dataset, auto-scheduling on](charts/bulk-on-tree.svg)

**Results table: Bulk edit — Flat chain and Project tree, auto-scheduling on.**

Measured in milliseconds — lower is better.

| Library                     | Shape        | 1000  | 5000      | 10k   | 50k   | 100k      |
|-----------------------------|--------------|-------|-----------|-------|-------|-----------|
| DHTMLX Gantt v10.0.3        | Flat chain   | 29    | 70        | 129   | 628   | 1293      |
| DHTMLX Gantt v10.0.3        | Project tree | 33    | 69        | 113   | 541   | 1105      |
| Bryntum Gantt v7.3.8        | Flat chain   | 428   | 1757      | 3617  | 20324 | unreached |
| Bryntum Gantt v7.3.8        | Project tree | 352   | 1123      | 2148  | 12152 | unreached |
| DevExtreme Gantt v26.1.6    | Flat chain   | DNF   | skip      | skip  | skip  | skip      |
| DevExtreme Gantt v26.1.6    | Project tree | error | skip      | skip  | skip  | skip      |
| Kendo UI Gantt v2026.3.1015 | Flat chain   | ***   | ***       | ***   | ***   | ***       |
| Kendo UI Gantt v2026.3.1015 | Project tree | ***   | ***       | ***   | ***   | ***       |
| Syncfusion Gantt v35.1.41   | Flat chain   | 8739  | unreached | skip  | skip  | skip      |
| Syncfusion Gantt v35.1.41   | Project tree | 4527  | 8600      | 14251 | 81371 | 181392    |

**Batching differences.** DHTMLX and Bryntum can suspend rendering and apply the whole batch in one repaint. The other three components have no effective equivalent: DevExtreme's `beginUpdate()`/`endUpdate()` pair defers option changes but not the re-render inside each task call, Kendo UI exposes no suspend mechanism at all, and Syncfusion accepts arrays for insertion and deletion but has no bulk counterpart for updates. Applying many changes in place therefore costs them roughly one repaint per change.

In practice an application using one of those three would replace the dataset outright instead. Dataset replacement is not measured here. It is also not a free substitution: it discards scroll position, selection and the contents of any open editor, so an application doing it during a background sync has to save and restore that state itself.

<!-- /BENCH:TEST:bulk -->

#### What these results show

> **TODO** — interpret the Bulk edit tables above following
> [`BENCHMARK_REPORT_EDITOR.md`](../../bench/BENCHMARK_REPORT_EDITOR.md#per-test-conclusions). Replace this entire
> block, keeping the heading.

<!-- BENCH:RESULT-NOTES -->

### Steps not attempted, and the failure each was inferred from

A step that failed in every run at one dataset size is not retried at larger sizes in the same mode and shape; `METHODOLOGY.md` states the rule and why the inference holds. The failure each skip was inferred from is named below, so no component's skipped results rest on anything a reader cannot check in the tables above.

- devextreme, flat, auto-scheduling off — 10 000, 50 000 tasks: bulk failed at 5 000
- devextreme, flat, auto-scheduling off — 100 000 tasks: fps failed at 50 000
- devextreme, flat, auto-scheduling on — 5 000 tasks: bulk failed at 1 000
- devextreme, flat, auto-scheduling on — 10 000, 50 000 tasks: move failed at 5 000
- devextreme, flat, auto-scheduling on — 100 000 tasks: fps failed at 50 000
- devextreme, tree, auto-scheduling off — 10 000, 50 000 tasks: bulk failed at 5 000
- devextreme, tree, auto-scheduling off — 100 000 tasks: fps failed at 50 000
- devextreme, tree, auto-scheduling on — 5 000, 10 000, 50 000 tasks: bulk failed at 1 000
- devextreme, tree, auto-scheduling on — 100 000 tasks: fps failed at 50 000
- kendo, flat, auto-scheduling off — 5 000, 10 000, 50 000 tasks: bulk failed at 1 000
- kendo, flat, auto-scheduling off — 100 000 tasks: move failed at 50 000
- kendo, tree, auto-scheduling off — 10 000, 50 000 tasks: bulk failed at 5 000
- kendo, tree, auto-scheduling off — 100 000 tasks: move failed at 50 000
- syncfusion, flat, auto-scheduling on — 10 000, 50 000, 100 000 tasks: move failed at 5 000

### Errors observed during measured runs

These runs produced at least one valid figure before a later step raised an error. The successful figures remain in the tables, and each error carries the number of the cell's runs that raised it. The messages are in the `note` column of `results.csv`, truncated there to keep the column readable.

- bryntum, tree, 100000 tasks, auto-scheduling on — `Browser tab crashed` in all 3 runs
- devextreme, flat, 5000 tasks, auto-scheduling on — `RangeError: Maximum call stack size exceeded` in all 3 runs
- devextreme, tree, 1000 tasks, auto-scheduling on — `Maximum call stack size exceeded` in all 3 runs
- syncfusion, flat, 5000 tasks, auto-scheduling on — `RangeError: Maximum call stack size exceeded` in all 3 runs

<!-- /BENCH:RESULT-NOTES -->

---

## Observed large-dataset limits

> **TODO** — write the round's scale limits following
> [`BENCHMARK_REPORT_EDITOR.md`](../../bench/BENCHMARK_REPORT_EDITOR.md#observed-large-dataset-limits).
> Replace this entire block.

## Cross-machine validation

> **TODO** — write the agreement paragraph following
> [`BENCHMARK_REPORT_EDITOR.md`](../../bench/BENCHMARK_REPORT_EDITOR.md#cross-machine-validation),
> or remove this section when one machine measured the round.

## Known limitations

Full details are in
[`METHODOLOGY.md`](../../METHODOLOGY.md#what-this-measurement-cannot-see) and
[Known asymmetries](../../CONFIGURATION.md#known-asymmetries).

- **Two synthetic dataset shapes.** They are separate workloads, not a controlled comparison.
- **Capabilities differ across the 5 components.** One lacks row
  virtualization, and only two can suspend rendering across a bulk batch.
- **Correctness was checked by eye, not asserted by the harness.** Each app was checked at
  1 000 tasks in both shapes for hierarchy, expansion and a visible auto-scheduling
  cascade; the harness does not verify correctness at 100 000.
- **Trial builds, no licence keys.** Banners and watermarks differ by library.
- **Memory measures only the JS heap.** It excludes DOM memory, so libraries rendering more DOM
  per row may use more memory than these figures suggest.
- **Scrolling FPS counts frames, not rendered content.** It cannot distinguish painting during
  the scroll from deferred row rendering.
- **One browser**, Chromium. These timings are not comparable with benchmarks that stop the
  clock when the API call returns rather than waiting for the UI to become quiescent.

> **TODO** — add any round-specific limitations following
> [`BENCHMARK_REPORT_EDITOR.md`](../../bench/BENCHMARK_REPORT_EDITOR.md#known-limitations). Replace
> this entire block, or remove it when no additional limitation applies.

## Reproducing this

```
npm ci
npm run setup
npm run bench
```

Read [Machine prerequisites](../../METHODOLOGY.md#machine-prerequisites) first. Results are saved
in `raw-results/<your-machine-id>/` in the published format for direct comparison.

Report differences that hardware does not explain in a GitHub issue — see
[Corrections](../../README.md#corrections).
