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

- **DHTMLX loads 100 000 project-tree tasks in about one second with auto-scheduling disabled** — the shortest time to ready among the 5 components in this round, against about 55 seconds for Bryntum and 1 minute 9 seconds for Syncfusion, while DevExtreme and Kendo UI do not finish loading at that size.
- **DHTMLX is the only component here that produced a figure for every test, size, shape and scheduling mode on all three machines** — Kendo UI has no auto-scheduling at all and, like DevExtreme, never loaded 100 000 tasks in either shape.
- **DHTMLX keeps auto-scheduled edits on a 100 000-task project tree to about a second** — a single move takes about one second and the bulk-edit stress test about 1.1 seconds, where Syncfusion needs about 9 seconds for the move and 3 minutes for the batch, and Bryntum does not complete the move.
- **Syncfusion 35.1.41 loads and edits large datasets far faster than 34.2.8 did in the previous round** — with scheduling disabled it now loads the 100 000-task flat chain in about 17 seconds instead of 3 minutes 8 seconds and moves a task on the 100 000-task project tree in about 3.4 seconds instead of 4 minutes 9 seconds, on both machines measured in both rounds.
- **DHTMLX, Bryntum and Syncfusion share the fastest scrolling group on the reference machine and `i9-11900K-win`, and this benchmark does not separate them there** — all three hold at or near the 60 Hz display limit through 100 000 tasks, while Kendo UI falls to about 6 FPS at 50 000 tasks and DevExtreme records no frames at all by 10 000; on the dual-core `i5-7200U-win` laptop only Syncfusion stays near the limit.
- **DevExtreme retains less heap than DHTMLX at 50 000 tasks with auto-scheduling enabled on the reference machine** — 61 MB against 93 MB on the project tree, the only results in this round that leave DHTMLX outside the fastest group, although DevExtreme schedules on change rather than during loading and does not load that size on either Windows machine.

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

**DHTMLX has the shortest time to ready at every tested size in both shapes with scheduling disabled.** At 100 000 project-tree tasks it is ready in about one second, against about 55 seconds for Bryntum and 1 minute 9 seconds for Syncfusion — a gap between those two that falls inside the 25% band — while DevExtreme and Kendo UI do not finish loading at that size in either shape.

**Loading delays become noticeable well before the largest dataset.** All five components load the 1 000-task project tree in under two thirds of a second with scheduling disabled, but at 10 000 tasks DHTMLX needs about a seventh of a second, Syncfusion about 2 seconds, Bryntum and Kendo UI about 4 seconds and DevExtreme about 12 seconds. At 50 000 Syncfusion and Bryntum take about 21 seconds, Kendo UI about 1 minute 25 seconds and DevExtreme about 4 minutes 10 seconds.

**With scheduling enabled, DHTMLX loads either 100 000-task shape in under 2.5 seconds.** Syncfusion loads the flat chain in about 12 seconds and the project tree in about 1 minute 4 seconds; Bryntum loads the project tree in about 1 minute 7 seconds but exceeds the five-minute limit on the flat chain, DevExtreme exceeds it in both shapes, and Kendo UI has no auto-scheduling mode to measure.

**Syncfusion 35.1.41 loads large datasets several times faster than 34.2.8 did in the previous round.** On the reference machine the 100 000-task flat chain is ready in about 17 seconds against 3 minutes 8 seconds with scheduling disabled, and the project tree in about 1 minute 9 seconds against 4 minutes 15 seconds. The Windows machine measured in both rounds shows the same direction in both modes, from 10 000 tasks up on the flat chain and from 50 000 up on the project tree.

**Syncfusion still reaches ready sooner with auto-scheduling enabled than disabled, but on the reference machine only the 100 000-task flat chain now shows it outside the 25% band.** There it takes about 12 seconds with the mode on against 17 seconds with it off, and every run on all three machines points the same way; the project tree, where the previous round found the larger gap, now loads within the band in both modes. The benchmark does not isolate the cause, so this is a result for these datasets and this version, not evidence that auto-scheduling generally speeds loading.

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

**DHTMLX paints first among the tested components at every size in both modes, and its two figures coincide.** At 100 000 project-tree tasks first paint and readiness are both about one second with scheduling disabled and about 2.4 seconds with it enabled, so its first frame arrives only once the chart is already usable.

**Bryntum paints early and finishes much later.** Its 100 000-task project tree shows rows after about 5 seconds in either mode but is not ready for about 55 seconds with scheduling disabled and about 1 minute 7 seconds with it enabled; the early image is not completed loading, and the wait that follows it is the one a user feels.

**DevExtreme also defers work past its first paint, while Kendo UI and Syncfusion do not.** At 50 000 project-tree tasks with scheduling disabled, DevExtreme paints in about 1 minute 58 seconds
but is ready after about 4 minutes 10 seconds, whereas Kendo UI's two figures fall within a second of each other at about 1 minute 25 seconds and Syncfusion reports the same figure for both at about
22 seconds. For those two the first image arrives only when loading has finished.

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

**DHTMLX retains the least heap at every tested size with scheduling disabled.** At 100 000 project-tree tasks it holds about 63 MB, against about 750 MB for Syncfusion and about 3.2 GB for Bryntum, while DevExtreme and Kendo UI do not load that size — a spread wide enough to decide whether a dataset fits in a browser tab at all.

**The field's heap growth rates differ far more than the smallest datasets suggest.** Between 1 000 and 50 000 project-tree tasks with scheduling disabled, DHTMLX goes from 5 MB to 33 MB and
DevExtreme from 13 MB to 61 MB, while Kendo UI goes from 27 MB to 191 MB, Syncfusion from 23 MB to 382 MB and Bryntum from 57 MB to about 1.6 GB.

**DevExtreme retains less heap than DHTMLX at 50 000 tasks with scheduling enabled on the reference machine — the only results in this round that leave DHTMLX outside the fastest group.** It holds
61 MB on the project tree and 62 MB on the flat chain against DHTMLX's 93 MB and 86 MB; neither Windows machine loads DevExtreme at 50 000 in this round, so the comparison rests on the Mac alone.
Its heap with the mode on equals its heap with the mode off, which follows from its scheduling on change rather than during loading ([known asymmetry 5](../../CONFIGURATION.md#known-asymmetries)).

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

**DHTMLX, Bryntum and Syncfusion share the fastest group wherever they complete this test on the reference machine.** All three stay at or within two frames of the 60 Hz display limit in every
shape and mode they produced a figure for, through 100 000 tasks, and `i9-11900K-win` shows the same; the display cannot show a difference between components that all keep pace with it.

**Kendo UI and DevExtreme drop to frame rates a user would see.** Kendo UI falls from 60 FPS at 1 000 project-tree tasks to about 32 FPS at 10 000 and about 6 FPS at 50 000, and DevExtreme is already at about 25 FPS at 1 000 and records no frames at all during the measured scroll by 10 000 in either shape or mode. At those rates the scroll is not slow but effectively frozen.

**On the dual-core `i5-7200U-win` laptop the shared group separates.** There Syncfusion holds 58 to 59 FPS at every size, while from 5 000 tasks up DHTMLX runs at about 36 to 49 FPS and Bryntum at about 14 to 23 FPS. The benchmark does not isolate which property of that machine produces the difference.

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

**DHTMLX completes a single move in about a quarter of a second on the 100 000-task project tree with scheduling disabled.** Syncfusion takes about 3.4 seconds and Bryntum about 6.6 seconds at that size, while DevExtreme and Kendo UI never reach it.

**The field separates as the dataset grows rather than at the smallest size.** With scheduling disabled every component moves a task in about half a second or less at 1 000 project-tree tasks, but at 10 000 DHTMLX stays under a tenth of a second and Syncfusion and Bryntum at about 0.4 seconds, while DevExtreme takes about 6.4 seconds and Kendo UI about 29 seconds.

**With scheduling enabled, DHTMLX moves a task on the 100 000-task project tree in about one second and on the flat chain in about 1.9 seconds.** Syncfusion takes about 9 seconds on the tree and stops
at 5 000 on the chain. Bryntum never reaches the 100 000-task chain, and on the tree its move fails in every run — the tab crashes on the reference machine and the move exceeds the five-minute limit on both Windows machines — where Bryntum 7.3.6 completed it in about 50 seconds in the previous round.

**The scheduled flat chain is where this test ends runs early.** A move there reschedules every task after it by construction, and at 5 000 tasks both DevExtreme and Syncfusion raise `Maximum call stack size exceeded` in every run on the reference machine, with DevExtreme already needing about 16 seconds at 1 000. The benchmark records the step, the size and the message, and does not isolate why either component reaches that state.

**Syncfusion 35.1.41 and Bryntum 7.3.8 move tasks much faster than the versions in the previous round, and DevExtreme 26.1.6 is slower on scheduled moves.** With scheduling disabled on the 100 000-task project tree, Syncfusion takes about 3.4 seconds against 4 minutes 9 seconds for 34.2.8 — and about 9 seconds against 4 minutes 11 seconds with scheduling enabled — while Bryntum needs between a quarter and a half less time than 7.3.6 from 5 000 tasks up, about 6.6 seconds against 12 seconds at 100 000. DevExtreme takes roughly twice as long as 26.1.4 on every scheduled move it
completes, such as about 16 seconds against 7 seconds on the 1000-task flat chain; each of these changes appears on both machines measured in both rounds.

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

**DHTMLX applies the whole batch in under half a second at every tested size with scheduling disabled.** At 100 000 project-tree tasks that is about four tenths of a second, against about 10.5 seconds for Bryntum and 2 minutes 38 seconds for Syncfusion. DHTMLX and Bryntum suspend rendering across the batch and the other three repaint per change, which is part of what this stress test measures.

**This stress test separates the field at 1 000 tasks, where loading does not.** On the project tree with scheduling disabled, DHTMLX and Bryntum finish in under a quarter of a second and Syncfusion in about 3 seconds, while DevExtreme takes about 49 seconds and Kendo UI about 4 minutes — and on the flat chain Kendo UI exceeds the five-minute limit outright. A dataset that loads in a fraction of a second can therefore still block the page for minutes on a batch of 300 changes.

**With scheduling enabled, DHTMLX completes the 100 000-task batch in about 1.1 seconds on the project tree and 1.3 seconds on the flat chain.** At 50 000 project-tree tasks Bryntum takes about
12 seconds and Syncfusion about 1 minute 21 seconds, against about half a second for DHTMLX. At 100 000 Syncfusion completes the project-tree batch in about 3 minutes, and Bryntum never reaches it because its move fails first.

**Two components' scheduled batches changed since the previous round.** Syncfusion 35.1.41 completes the 100 000-task project-tree batch on the reference machine, where 34.2.8 never settled, and on the Windows machine measured in both rounds it falls from about 4 minutes 16 seconds to 2 minutes 39 seconds. DevExtreme 26.1.6 records no figure for the 1 000-task project-tree batch on either of those machines, where 26.1.4 recorded about 1 minute 31 seconds; both versions note the same `Maximum call stack size exceeded` message there.

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

**DHTMLX is the only tested component that produced a figure for every metric, size, shape and scheduling mode, on all three machines.** Bryntum and Syncfusion also complete the whole sequence
through 100 000 tasks in both shapes with scheduling disabled on the reference machine, though their largest edits take seconds to minutes rather than fractions of a second.

**With scheduling enabled, completion depends on the workload and not on size alone.** Bryntum loads the 100 000-task project tree but its move there fails in every run, and its flat-chain load exceeds the five-minute limit; Syncfusion completes every step on the project tree through 100 000 tasks on the reference machine, but its flat-chain move fails at 5 000, which leaves the steps after it unmeasured at that size and above.

**DevExtreme and Kendo UI reach their editing limits well before their loading limits.** DevExtreme's bulk edit exceeds the five-minute limit at 5 000 tasks with scheduling disabled and fails at 1 000 in both shapes with it enabled, and its scheduled flat-chain move fails at 5 000; Kendo UI, which has no auto-scheduling mode, exceeds the limit on the 1 000-task flat-chain batch, the 5 000-task project-tree batch and the 50 000-task move. Neither component finishes loading 100 000 tasks in either shape.

**The benchmark records how these runs ended, not why.** Two components raise `Maximum call stack size exceeded` on scheduled edits, and Bryntum crashes its tab on the largest scheduled move on the reference machine; the harness observes the step, the marker and the message, and nothing that would identify the cause inside the component.

## Cross-machine validation

**The two Windows machines, `i9-11900K-win` and `i5-7200U-win`, support the conclusions above.** No pair of machines reverses an ordering the other calls meaningful, and the fastest groups overlap in every test except heap at 50 000 tasks with scheduling enabled, where DevExtreme leads only on the Mac because it does not load that size on Windows in this round. The dual-core `i5-7200U-win` laptop is several times slower in absolute terms, reaches the five-minute limit earlier for DevExtreme, Kendo UI and Syncfusion, and is the one machine where scrolling separates DHTMLX, Bryntum and Syncfusion.

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

- **Some completion limits depend on the machine.** DevExtreme loads 50 000 tasks only on the Mac, which is where its heap comparison at that size comes from; Kendo UI's 1 000-task project-tree batch completes only on the Mac; and Syncfusion's 100 000-task batch does not settle on `i5-7200U-win`.
- **The shared scrolling group holds only on the two faster machines.** On `i5-7200U-win` DHTMLX and Bryntum fall below the display limit while Syncfusion does not.
- **Syncfusion's configuration changed between rounds.** Harness 1.0.1 removes `validateManualTasksOnLinking`; an A/B check at 1 000 tasks in both modes and shapes produced identical schedules and validation work with and without it, so the removal does not account for the Syncfusion changes reported above.
- **Changes since the previous round are observed, not explained.** They compare the same machines, operating systems and Chromium build across library versions; the benchmark does not isolate which change inside a library produces them.

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
