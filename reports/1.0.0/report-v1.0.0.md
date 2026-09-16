# JavaScript Gantt chart performance — round v1.0.0

## Libraries measured

This round compares 5 vanilla JavaScript Gantt components:

<!-- BENCH:LIBRARIES -->

- [**DHTMLX Gantt** v10.0.3](https://dhtmlx.com/docs/products/dhtmlxGantt/)
- [**Bryntum Gantt** v7.3.6](https://www.bryntum.com/products/gantt/)
- [**DevExtreme Gantt** v26.1.4](https://js.devexpress.com/jQuery/Documentation/Guide/UI_Components/Gantt/Overview/)
- [**Kendo UI Gantt** v2026.3.811](https://www.telerik.com/kendo-jquery-ui/gantt)
- [**Syncfusion Gantt** v34.2.8](https://ej2.syncfusion.com/documentation/gantt/overview)

<!-- /BENCH:LIBRARIES -->

This repository's harness produced these measurements. See
[`METHODOLOGY.md`](../../METHODOLOGY.md) for measurement methods and
[`CONFIGURATION.md`](../../CONFIGURATION.md) for workloads and settings.

<!-- BENCH:MACHINE -->

Machine MacBook Air M1 (`Apple-M1-mac`) — Apple M1, RAM 16 GB, darwin 24.6.0, Chromium 151.0.7922.34, 60 Hz display. Each figure is the median of the runs that produced one, out of 3 independent fresh-browser runs of every test; where a figure came from fewer, the count is printed beside it. Every individual run is in `runs.csv`. The harness kept the machine awake for the duration of the run. Measured across 3 sessions; the `session` column in `results.csv` identifies the source of each cell.

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

- **DHTMLX loads 100 000 project-tree tasks in about one second with auto-scheduling disabled** —
  the shortest time to ready among the 5 components in this round, against about 53 seconds for
  Bryntum and 4 minutes 15 seconds for Syncfusion, while DevExtreme and Kendo UI exceeded the
  five-minute limit at that size.
- **DHTMLX is the only component here that produced a figure for every test, size, shape and
  scheduling mode on both machines** — Kendo UI has no auto-scheduling at all and, like DevExtreme,
  never loaded 100 000 tasks in either shape.
- **DHTMLX keeps auto-scheduled edits on a 100 000-task project tree to about a second** — a single
  move takes about one second and the bulk-edit stress test about 1.1 seconds, where Bryntum needs
  about 50 seconds for the move and crashes the tab on the batch, and Syncfusion needs over four
  minutes for the move.
- **Bulk editing separates the field at 1 000 tasks, long before loading does** — with scheduling
  disabled the 300-change batch on a 1 000-task project tree takes under a quarter of a second for
  DHTMLX and Bryntum, about 3 seconds for Syncfusion, about 46 seconds for DevExtreme and about
  4 minutes for Kendo UI.
- **DHTMLX, Bryntum and Syncfusion share the fastest scrolling group, and this benchmark does not
  separate them** — all three hold at or near the 60 Hz display limit through 100 000 tasks, while
  Kendo UI falls to about 5 FPS at 50 000 tasks and DevExtreme records no frames at all by 10 000.
- **DevExtreme retains less heap than DHTMLX at 50 000 tasks with auto-scheduling enabled** — 61 MB
  against 93 MB on the project tree on both machines, the only results in this round that leave
  DHTMLX outside the fastest group, although DevExtreme schedules on change rather than during
  loading.

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
- `***` — Library does not provide auto-scheduling logic.
- `unreached` — Never attempted. Every test of a run shares one chart in a fixed order — load, scroll, move, bulk edit — and at this size the run stopped at a step before this one, which carries the marker that says why. Not a measurement of this test.
- `skip` — Not attempted. Every run at a smaller dataset in this mode and shape failed at this step, and each step is measured on the chart the ones before it left — so the step and everything after it are skipped at every larger size, while the steps before it were measured and their figures are in this row. The list below the tables names the step and the size each skip was inferred from.
- `error` — Test execution was aborted due to an in-page error. Marks the step it happened at, and no other: the steps after it were never attempted at this size.
- `no-settle` — The chart never went quiet within the time limit, so no figure was recorded. Reported as a failure rather than as the value of the time limit, which would have said nothing about the library. Marks the step it happened at, and no other: the steps after it were never attempted at this size.

<!-- /BENCH:MARKERS -->

### Test: Time to ready (TTR)

<!-- BENCH:TEST:ttr -->

Loads the chart with the given number of tasks and the links between them, and measures the time until loading, scheduling and rendering have all finished and the chart is usable. This is time to *ready*, not time to first paint: the clock stops when the UI goes quiet, so work a library defers to later frames is counted.

#### Auto-scheduling — disabled

![Time to ready (TTR), Flat chain dataset, auto-scheduling off](charts/ttr-off-flat.svg)
![Time to ready (TTR), Project tree dataset, auto-scheduling off](charts/ttr-off-tree.svg)

**Results table: Time to ready (TTR) — Flat chain and Project tree, auto-scheduling off.**

Measured in milliseconds — lower is better.

| Library                    | Shape        | 1000 | 5000 | 10k   | 50k    | 100k   |
|----------------------------|--------------|------|------|-------|--------|--------|
| DHTMLX Gantt v10.0.3       | Flat chain   | 59   | 93   | 133   | 414    | 760    |
| DHTMLX Gantt v10.0.3       | Project tree | 58   | 98   | 145   | 520    | 1005   |
| Bryntum Gantt v7.3.6       | Flat chain   | 610  | 2052 | 3952  | 21538  | 55495  |
| Bryntum Gantt v7.3.6       | Project tree | 603  | 2033 | 3864  | 20741  | 53471  |
| DevExtreme Gantt v26.1.4   | Flat chain   | 285  | 3717 | 13319 | 286016 | DNF    |
| DevExtreme Gantt v26.1.4   | Project tree | 265  | 3323 | 11647 | 243656 | DNF    |
| Kendo UI Gantt v2026.3.811 | Flat chain   | 207  | 1501 | 4316  | 81095  | DNF    |
| Kendo UI Gantt v2026.3.811 | Project tree | 215  | 1496 | 4446  | 85977  | DNF    |
| Syncfusion Gantt v34.2.8   | Flat chain   | 232  | 696  | 2784  | 43381  | 187609 |
| Syncfusion Gantt v34.2.8   | Project tree | 265  | 815  | 3533  | 57247  | 254962 |

#### Auto-scheduling — enabled

![Time to ready (TTR), Flat chain dataset, auto-scheduling on](charts/ttr-on-flat.svg)
![Time to ready (TTR), Project tree dataset, auto-scheduling on](charts/ttr-on-tree.svg)

**Results table: Time to ready (TTR) — Flat chain and Project tree, auto-scheduling on.**

Measured in milliseconds — lower is better.

| Library                    | Shape        | 1000 | 5000 | 10k   | 50k    | 100k   |
|----------------------------|--------------|------|------|-------|--------|--------|
| DHTMLX Gantt v10.0.3       | Flat chain   | 88   | 185  | 312   | 1154   | 2235   |
| DHTMLX Gantt v10.0.3       | Project tree | 89   | 195  | 311   | 1255   | 2399   |
| Bryntum Gantt v7.3.6       | Flat chain   | 703  | 2922 | 6608  | 80657  | DNF    |
| Bryntum Gantt v7.3.6       | Project tree | 686  | 2349 | 4493  | 23862  | 61769  |
| DevExtreme Gantt v26.1.4   | Flat chain   | 286  | 3719 | 13312 | 283727 | DNF    |
| DevExtreme Gantt v26.1.4   | Project tree | 265  | 3321 | 11621 | 244303 | DNF    |
| Kendo UI Gantt v2026.3.811 | Flat chain   | ***  | ***  | ***   | ***    | ***    |
| Kendo UI Gantt v2026.3.811 | Project tree | ***  | ***  | ***   | ***    | ***    |
| Syncfusion Gantt v34.2.8   | Flat chain   | 247  | 732  | 2472  | 34824  | 145631 |
| Syncfusion Gantt v34.2.8   | Project tree | 269  | 847  | 2535  | 33721  | 138840 |

<!-- /BENCH:TEST:ttr -->

#### What these results show

**DHTMLX has the shortest time to ready at every tested size with scheduling disabled.** At
100 000 project-tree tasks it is ready in about one second, against about 53 seconds for Bryntum
and 4 minutes 15 seconds for Syncfusion; DevExtreme and Kendo UI exceeded the five-minute limit
at that size in both shapes.

**Loading delays become noticeable well before the largest dataset.** All five components load the
1 000-task project tree in under a second with scheduling disabled, but at 10 000 tasks Syncfusion,
Bryntum and Kendo UI take between about 3.5 and 4.5 seconds and DevExtreme about 12 seconds, and at
50 000 those same four range from about 21 seconds to over 4 minutes.

**With scheduling enabled, DHTMLX loads either 100 000-task shape in under 2.5 seconds.** Bryntum
loads the project tree in about 1 minute 2 seconds but exceeds the five-minute limit on the flat
chain; Syncfusion loads both, in about 2 minutes 19 seconds for the tree and 2 minutes 26 seconds
for the chain, and Kendo UI has no auto-scheduling mode to measure.

**Syncfusion reaches ready sooner with auto-scheduling enabled than disabled on the larger
datasets.** At 100 000 project-tree tasks it takes about 2 minutes 19 seconds with the mode on
against 4 minutes 15 seconds with it off, and every run at 50 000 and 100 000 in both shapes on
both machines points the same way. The benchmark does not isolate the cause, so this is a result
for these datasets and this version, not evidence that auto-scheduling generally speeds loading.

### Test: Time to first paint (TTFP)

<!-- BENCH:TEST:ttfp -->

The same load, measured to the first frame that has rows on screen rather than to the last — any rows, so in the project tree the rows that stop the clock may be summary rows. Time to ready is the primary figure because it is the point at which the chart is usable, but it is also the measurement that most penalises an engine for deferring work — so the figure that credits deferring is published beside it. A library that paints early and finishes late scores well here and badly above; one that does all its work before painting reports the same figure for both.

#### Auto-scheduling — disabled

![Time to first paint (TTFP), Flat chain dataset, auto-scheduling off](charts/ttfp-off-flat.svg)
![Time to first paint (TTFP), Project tree dataset, auto-scheduling off](charts/ttfp-off-tree.svg)

**Results table: Time to first paint (TTFP) — Flat chain and Project tree, auto-scheduling off.**

Measured in milliseconds — lower is better.

| Library                    | Shape        | 1000 | 5000 | 10k  | 50k    | 100k   |
|----------------------------|--------------|------|------|------|--------|--------|
| DHTMLX Gantt v10.0.3       | Flat chain   | 59   | 93   | 133  | 414    | 760    |
| DHTMLX Gantt v10.0.3       | Project tree | 58   | 98   | 145  | 520    | 1005   |
| Bryntum Gantt v7.3.6       | Flat chain   | 190  | 392  | 662  | 2609   | 4941   |
| Bryntum Gantt v7.3.6       | Project tree | 192  | 396  | 657  | 2605   | 4914   |
| DevExtreme Gantt v26.1.4   | Flat chain   | 212  | 1884 | 6527 | 141376 | DNF    |
| DevExtreme Gantt v26.1.4   | Project tree | 200  | 1640 | 5569 | 114696 | DNF    |
| Kendo UI Gantt v2026.3.811 | Flat chain   | 207  | 1438 | 4241 | 80709  | DNF    |
| Kendo UI Gantt v2026.3.811 | Project tree | 215  | 1440 | 4372 | 85594  | DNF    |
| Syncfusion Gantt v34.2.8   | Flat chain   | 232  | 696  | 2784 | 43381  | 187609 |
| Syncfusion Gantt v34.2.8   | Project tree | 265  | 815  | 3533 | 57247  | 254962 |

#### Auto-scheduling — enabled

![Time to first paint (TTFP), Flat chain dataset, auto-scheduling on](charts/ttfp-on-flat.svg)
![Time to first paint (TTFP), Project tree dataset, auto-scheduling on](charts/ttfp-on-tree.svg)

**Results table: Time to first paint (TTFP) — Flat chain and Project tree, auto-scheduling on.**

Measured in milliseconds — lower is better.

| Library                    | Shape        | 1000 | 5000 | 10k  | 50k    | 100k   |
|----------------------------|--------------|------|------|------|--------|--------|
| DHTMLX Gantt v10.0.3       | Flat chain   | 88   | 185  | 312  | 1154   | 2235   |
| DHTMLX Gantt v10.0.3       | Project tree | 88   | 195  | 311  | 1255   | 2399   |
| Bryntum Gantt v7.3.6       | Flat chain   | 190  | 396  | 663  | 2552   | DNF    |
| Bryntum Gantt v7.3.6       | Project tree | 193  | 398  | 661  | 2609   | 4925   |
| DevExtreme Gantt v26.1.4   | Flat chain   | 213  | 1887 | 6495 | 140233 | DNF    |
| DevExtreme Gantt v26.1.4   | Project tree | 200  | 1638 | 5553 | 114529 | DNF    |
| Kendo UI Gantt v2026.3.811 | Flat chain   | ***  | ***  | ***  | ***    | ***    |
| Kendo UI Gantt v2026.3.811 | Project tree | ***  | ***  | ***  | ***    | ***    |
| Syncfusion Gantt v34.2.8   | Flat chain   | 247  | 732  | 2472 | 34824  | 145631 |
| Syncfusion Gantt v34.2.8   | Project tree | 269  | 847  | 2535 | 33721  | 138840 |

<!-- /BENCH:TEST:ttfp -->

#### What these results show

**DHTMLX paints first among the tested components in both modes, and its two figures coincide.**
At 100 000 project-tree tasks first paint and readiness are both about one second with scheduling
disabled and about 2.4 seconds with it enabled, so its first frame arrives only once the chart is
already usable.

**Bryntum paints early and finishes much later.** Its 100 000-task project tree shows rows after
about 5 seconds in either mode but is not ready for about 53 seconds with scheduling disabled and
about 1 minute 2 seconds with it enabled; the early image is not completed loading, and the wait
that follows it is the one a user feels.

**DevExtreme also defers work past its first paint, while Kendo UI and Syncfusion do not.** At
50 000 project-tree tasks with scheduling disabled, DevExtreme paints in about 1 minute 55 seconds
but is ready after about 4 minutes 4 seconds, whereas Kendo UI's two figures are both about
1 minute 26 seconds and Syncfusion reports the same figure for both at about 57 seconds. For those
two the first image arrives too late to serve as progress feedback.

### Test: Memory usage

<!-- BENCH:TEST:memory -->

JavaScript heap still retained once the dataset is loaded, sampled after a forced garbage collection so the figure is live data rather than uncollected garbage.

#### Auto-scheduling — disabled

![Memory usage, Flat chain dataset, auto-scheduling off](charts/memory-off-flat.svg)
![Memory usage, Project tree dataset, auto-scheduling off](charts/memory-off-tree.svg)

**Results table: Memory usage — Flat chain and Project tree, auto-scheduling off.**

Measured in megabytes — lower is better.

| Library                    | Shape        | 1000 | 5000 | 10k | 50k  | 100k      |
|----------------------------|--------------|------|------|-----|------|-----------|
| DHTMLX Gantt v10.0.3       | Flat chain   | 5    | 8    | 10  | 33   | 62        |
| DHTMLX Gantt v10.0.3       | Project tree | 5    | 8    | 10  | 33   | 63        |
| Bryntum Gantt v7.3.6       | Flat chain   | 55   | 172  | 319 | 1532 | 3039      |
| Bryntum Gantt v7.3.6       | Project tree | 55   | 172  | 318 | 1529 | 3033      |
| DevExtreme Gantt v26.1.4   | Flat chain   | 13   | 17   | 22  | 62   | unreached |
| DevExtreme Gantt v26.1.4   | Project tree | 13   | 17   | 22  | 61   | unreached |
| Kendo UI Gantt v2026.3.811 | Flat chain   | 27   | 40   | 56  | 187  | unreached |
| Kendo UI Gantt v2026.3.811 | Project tree | 27   | 41   | 57  | 191  | unreached |
| Syncfusion Gantt v34.2.8   | Flat chain   | 21   | 43   | 71  | 293  | 571       |
| Syncfusion Gantt v34.2.8   | Project tree | 23   | 52   | 89  | 386  | 755       |

#### Auto-scheduling — enabled

![Memory usage, Flat chain dataset, auto-scheduling on](charts/memory-on-flat.svg)
![Memory usage, Project tree dataset, auto-scheduling on](charts/memory-on-tree.svg)

**Results table: Memory usage — Flat chain and Project tree, auto-scheduling on.**

Measured in megabytes — lower is better.

| Library                    | Shape        | 1000 | 5000 | 10k | 50k  | 100k      |
|----------------------------|--------------|------|------|-----|------|-----------|
| DHTMLX Gantt v10.0.3       | Flat chain   | 7    | 14   | 22  | 86   | 167       |
| DHTMLX Gantt v10.0.3       | Project tree | 7    | 14   | 23  | 93   | 181       |
| Bryntum Gantt v7.3.6       | Flat chain   | 57   | 178  | 331 | 1596 | unreached |
| Bryntum Gantt v7.3.6       | Project tree | 57   | 177  | 328 | 1578 | 3130      |
| DevExtreme Gantt v26.1.4   | Flat chain   | 13   | 17   | 22  | 62   | unreached |
| DevExtreme Gantt v26.1.4   | Project tree | 13   | 17   | 22  | 61   | unreached |
| Kendo UI Gantt v2026.3.811 | Flat chain   | ***  | ***  | *** | ***  | ***       |
| Kendo UI Gantt v2026.3.811 | Project tree | ***  | ***  | *** | ***  | ***       |
| Syncfusion Gantt v34.2.8   | Flat chain   | 21   | 44   | 72  | 300  | 584       |
| Syncfusion Gantt v34.2.8   | Project tree | 23   | 53   | 91  | 392  | 768       |

<!-- /BENCH:TEST:memory -->

#### What these results show

**DHTMLX retains the least heap at every tested size with scheduling disabled.** At 100 000
project-tree tasks it holds about 63 MB, against about 755 MB for Syncfusion and about 3.0 GB for
Bryntum — a spread wide enough to decide whether a dataset fits in a browser tab at all.

**The field's heap growth rates differ far more than the smallest datasets suggest.** Between
1 000 and 50 000 project-tree tasks with scheduling disabled, DHTMLX goes from 5 MB to 33 MB and
DevExtreme from 13 MB to 61 MB, while Kendo UI goes from 27 MB to 191 MB, Syncfusion from 23 MB to
386 MB and Bryntum from 55 MB to about 1.5 GB.

**DevExtreme retains less heap than DHTMLX at 50 000 tasks with scheduling enabled — the only
results in this round that leave DHTMLX outside the fastest group.** On the project tree it holds
61 MB against DHTMLX's 93 MB on both machines, and on the Mac's flat chain 62 MB against 86 MB, a
dataset DevExtreme does not load on Windows. Its heap with the mode on is identical to its heap
with the mode off, which follows from its scheduling on change rather than during loading
([known asymmetry 5](../../CONFIGURATION.md#known-asymmetries)).

### Test: Scrolling FPS

<!-- BENCH:TEST:fps -->

Scrolls the chart from the first row to the last in 100 equal steps, one per animation frame, and counts the frames actually rendered during the scroll. Every library is given the identical scroll — same number of steps, same fraction of the way down per step — so the only thing that varies is how long it takes to render it. The browser cannot draw faster than the display refreshes, so the measuring machine's refresh rate in the environment block is a perfect score rather than a ceiling to beat. The worst one-second stretch of each scroll is recorded as `fpsMin` in `results.csv`.

#### Auto-scheduling — disabled

![Scrolling FPS, Flat chain dataset, auto-scheduling off](charts/fps-off-flat.svg)
![Scrolling FPS, Project tree dataset, auto-scheduling off](charts/fps-off-tree.svg)

**Results table: Scrolling FPS — Flat chain and Project tree, auto-scheduling off.**

Measured in frames per second — higher is better.

| Library                    | Shape        | 1000 | 5000 | 10k | 50k | 100k      |
|----------------------------|--------------|------|------|-----|-----|-----------|
| DHTMLX Gantt v10.0.3       | Flat chain   | 60   | 60   | 60  | 60  | 60        |
| DHTMLX Gantt v10.0.3       | Project tree | 60   | 60   | 60  | 60  | 60        |
| Bryntum Gantt v7.3.6       | Flat chain   | 60   | 60   | 60  | 60  | 58        |
| Bryntum Gantt v7.3.6       | Project tree | 60   | 59   | 60  | 60  | 58        |
| DevExtreme Gantt v26.1.4   | Flat chain   | 23   | 1    | 0   | DNF | skip      |
| DevExtreme Gantt v26.1.4   | Project tree | 25   | 2    | 0   | DNF | skip      |
| Kendo UI Gantt v2026.3.811 | Flat chain   | 60   | 54   | 28  | 5   | unreached |
| Kendo UI Gantt v2026.3.811 | Project tree | 60   | 50   | 27  | 5   | unreached |
| Syncfusion Gantt v34.2.8   | Flat chain   | 60   | 60   | 61  | 60  | 60        |
| Syncfusion Gantt v34.2.8   | Project tree | 60   | 60   | 60  | 60  | 60        |

#### Auto-scheduling — enabled

![Scrolling FPS, Flat chain dataset, auto-scheduling on](charts/fps-on-flat.svg)
![Scrolling FPS, Project tree dataset, auto-scheduling on](charts/fps-on-tree.svg)

**Results table: Scrolling FPS — Flat chain and Project tree, auto-scheduling on.**

Measured in frames per second — higher is better.

| Library                    | Shape        | 1000 | 5000 | 10k | 50k | 100k      |
|----------------------------|--------------|------|------|-----|-----|-----------|
| DHTMLX Gantt v10.0.3       | Flat chain   | 60   | 60   | 60  | 60  | 60        |
| DHTMLX Gantt v10.0.3       | Project tree | 60   | 60   | 60  | 60  | 60        |
| Bryntum Gantt v7.3.6       | Flat chain   | 60   | 60   | 60  | 60  | unreached |
| Bryntum Gantt v7.3.6       | Project tree | 60   | 60   | 60  | 60  | 58        |
| DevExtreme Gantt v26.1.4   | Flat chain   | 23   | 1    | 0   | DNF | skip      |
| DevExtreme Gantt v26.1.4   | Project tree | 25   | 2    | 0   | DNF | skip      |
| Kendo UI Gantt v2026.3.811 | Flat chain   | ***  | ***  | *** | *** | ***       |
| Kendo UI Gantt v2026.3.811 | Project tree | ***  | ***  | *** | *** | ***       |
| Syncfusion Gantt v34.2.8   | Flat chain   | 60   | 60   | 60  | 60  | 59        |
| Syncfusion Gantt v34.2.8   | Project tree | 60   | 60   | 60  | 61  | 60        |

<!-- /BENCH:TEST:fps -->

#### What these results show

**DHTMLX, Bryntum and Syncfusion share the fastest group wherever they complete this test.** All
three stay at or within a couple of frames of the 60 Hz display limit in every shape and mode they
produced a figure for, through 100 000 tasks, so these measurements do not separate their
scrolling; the display cannot show a difference between components that all keep pace with it.

**Kendo UI and DevExtreme drop to frame rates a user would see.** Kendo UI falls from 60 FPS at
1 000 project-tree tasks to 27 FPS at 10 000 and about 5 FPS at 50 000, and DevExtreme is already
at about 25 FPS at 1 000 and records no frames at all during the measured scroll by 10 000 in
either shape or mode. At those rates the scroll is not slow but effectively frozen.

### Test: Moving a task

<!-- BENCH:TEST:move -->

Moves a single task one month forward — the most common edit in a Gantt chart — and measures the time until the chart has finished reacting, including every dependent task rescheduled when auto-scheduling is enabled.

#### Auto-scheduling — disabled

![Moving a task, Flat chain dataset, auto-scheduling off](charts/move-off-flat.svg)
![Moving a task, Project tree dataset, auto-scheduling off](charts/move-off-tree.svg)

**Results table: Moving a task — Flat chain and Project tree, auto-scheduling off.**

Measured in milliseconds — lower is better.

| Library                    | Shape        | 1000 | 5000 | 10k   | 50k       | 100k   |
|----------------------------|--------------|------|------|-------|-----------|--------|
| DHTMLX Gantt v10.0.3       | Flat chain   | 15   | 30   | 41    | 165       | 316    |
| DHTMLX Gantt v10.0.3       | Project tree | 15   | 24   | 38    | 129       | 256    |
| Bryntum Gantt v7.3.6       | Flat chain   | 102  | 327  | 618   | 4270      | 10783  |
| Bryntum Gantt v7.3.6       | Project tree | 110  | 356  | 664   | 4084      | 12007  |
| DevExtreme Gantt v26.1.4   | Flat chain   | 137  | 1606 | 6739  | unreached | skip   |
| DevExtreme Gantt v26.1.4   | Project tree | 125  | 1471 | 5972  | unreached | skip   |
| Kendo UI Gantt v2026.3.811 | Flat chain   | 351  | 5298 | 19433 | DNF       | skip   |
| Kendo UI Gantt v2026.3.811 | Project tree | 534  | 7857 | 29338 | DNF       | skip   |
| Syncfusion Gantt v34.2.8   | Flat chain   | 89   | 290  | 2553  | 47389     | 220997 |
| Syncfusion Gantt v34.2.8   | Project tree | 89   | 285  | 2597  | 51931     | 248695 |

#### Auto-scheduling — enabled

![Moving a task, Flat chain dataset, auto-scheduling on](charts/move-on-flat.svg)
![Moving a task, Project tree dataset, auto-scheduling on](charts/move-on-tree.svg)

**Results table: Moving a task — Flat chain and Project tree, auto-scheduling on.**

Measured in milliseconds — lower is better.

| Library                    | Shape        | 1000 | 5000  | 10k   | 50k       | 100k      |
|----------------------------|--------------|------|-------|-------|-----------|-----------|
| DHTMLX Gantt v10.0.3       | Flat chain   | 53   | 130   | 235   | 940       | 1902      |
| DHTMLX Gantt v10.0.3       | Project tree | 46   | 84    | 126   | 496       | 964       |
| Bryntum Gantt v7.3.6       | Flat chain   | 372  | 1513  | 3008  | 16339     | unreached |
| Bryntum Gantt v7.3.6       | Project tree | 310  | 1119  | 2180  | 12066     | 49738     |
| DevExtreme Gantt v26.1.4   | Flat chain   | 7241 | error | skip  | skip      | skip      |
| DevExtreme Gantt v26.1.4   | Project tree | 1086 | 5699  | 17143 | unreached | skip      |
| Kendo UI Gantt v2026.3.811 | Flat chain   | ***  | ***   | ***   | ***       | ***       |
| Kendo UI Gantt v2026.3.811 | Project tree | ***  | ***   | ***   | ***       | ***       |
| Syncfusion Gantt v34.2.8   | Flat chain   | 256  | error | skip  | skip      | skip      |
| Syncfusion Gantt v34.2.8   | Project tree | 183  | 409   | 2765  | 53826     | 251402    |

<!-- /BENCH:TEST:move -->

#### What these results show

**DHTMLX completes a single move in about a quarter of a second on the 100 000-task project tree
with scheduling disabled.** Bryntum takes about 12 seconds and Syncfusion about 4 minutes 9 seconds
at that size, while DevExtreme and Kendo UI never reach it.

**The field separates as the dataset grows rather than at the smallest size.** With scheduling
disabled every component moves a task in under a second at 1 000 project-tree tasks, but at 10 000
DHTMLX stays under a tenth of a second and Bryntum at about two thirds of a second, while
Syncfusion takes about 2.6 seconds, DevExtreme about 6 seconds and Kendo UI about 29 seconds.

**With scheduling enabled, DHTMLX moves a task on the 100 000-task project tree in about one second
and on the flat chain in about 1.9 seconds.** Bryntum takes about 50 seconds on the tree and never
reaches the chain at that size; Syncfusion takes about 4 minutes 11 seconds on the tree and stops
at 5 000 on the chain.

**The scheduled flat chain is where this test ends runs early.** A move there reschedules every
task after it by construction, and at 5 000 tasks both DevExtreme and Syncfusion raise
`Maximum call stack size exceeded` in every run, with DevExtreme already needing about 7 seconds
at 1 000. The benchmark records the step, the size and the message, and does not isolate why either
component reaches that state.

### Test: Bulk edit

<!-- BENCH:TEST:bulk -->

Applies 100 task updates, 100 deletions and 100 insertions as one batch, and measures the time until the chart has finished reacting. This is the shape of a server sync, an imported plan or an undone bulk operation. Every library applies the changes in place through its own documented API, using its batching mechanism where it has one — see the note under the tables for what that means for the components that do not.

#### Auto-scheduling — disabled

![Bulk edit, Flat chain dataset, auto-scheduling off](charts/bulk-off-flat.svg)
![Bulk edit, Project tree dataset, auto-scheduling off](charts/bulk-off-tree.svg)

**Results table: Bulk edit — Flat chain and Project tree, auto-scheduling off.**

Measured in milliseconds — lower is better.

| Library                    | Shape        | 1000   | 5000 | 10k   | 50k    | 100k   |
|----------------------------|--------------|--------|------|-------|--------|--------|
| DHTMLX Gantt v10.0.3       | Flat chain   | 41     | 47   | 64    | 211    | 391    |
| DHTMLX Gantt v10.0.3       | Project tree | 42     | 50   | 63    | 217    | 406    |
| Bryntum Gantt v7.3.6       | Flat chain   | 241    | 691  | 1278  | 6978   | 21615  |
| Bryntum Gantt v7.3.6       | Project tree | 212    | 432  | 725   | 3642   | 12344  |
| DevExtreme Gantt v26.1.4   | Flat chain   | 49116  | DNF  | skip  | skip   | skip   |
| DevExtreme Gantt v26.1.4   | Project tree | 45997  | DNF  | skip  | skip   | skip   |
| Kendo UI Gantt v2026.3.811 | Flat chain   | DNF    | skip | skip  | skip   | skip   |
| Kendo UI Gantt v2026.3.811 | Project tree | 238175 | DNF  | skip  | skip   | skip   |
| Syncfusion Gantt v34.2.8   | Flat chain   | 2858   | 7688 | 14697 | 100280 | 248538 |
| Syncfusion Gantt v34.2.8   | Project tree | 2870   | 6241 | 11442 | 79534  | 205108 |

#### Auto-scheduling — enabled

![Bulk edit, Flat chain dataset, auto-scheduling on](charts/bulk-on-flat.svg)
![Bulk edit, Project tree dataset, auto-scheduling on](charts/bulk-on-tree.svg)

**Results table: Bulk edit — Flat chain and Project tree, auto-scheduling on.**

Measured in milliseconds — lower is better.

| Library                    | Shape        | 1000  | 5000      | 10k   | 50k    | 100k      |
|----------------------------|--------------|-------|-----------|-------|--------|-----------|
| DHTMLX Gantt v10.0.3       | Flat chain   | 28    | 66        | 126   | 617    | 1289      |
| DHTMLX Gantt v10.0.3       | Project tree | 31    | 67        | 110   | 525    | 1106      |
| Bryntum Gantt v7.3.6       | Flat chain   | 439   | 1769      | 3628  | 20371  | unreached |
| Bryntum Gantt v7.3.6       | Project tree | 363   | 1168      | 2286  | 13021  | error     |
| DevExtreme Gantt v26.1.4   | Flat chain   | DNF   | skip      | skip  | skip   | skip      |
| DevExtreme Gantt v26.1.4   | Project tree | 90793 | DNF       | skip  | skip   | skip      |
| Kendo UI Gantt v2026.3.811 | Flat chain   | ***   | ***       | ***   | ***    | ***       |
| Kendo UI Gantt v2026.3.811 | Project tree | ***   | ***       | ***   | ***    | ***       |
| Syncfusion Gantt v34.2.8   | Flat chain   | 11087 | unreached | skip  | skip   | skip      |
| Syncfusion Gantt v34.2.8   | Project tree | 3830  | 8473      | 15535 | 118094 | no-settle |

**Batching differences.** DHTMLX and Bryntum can suspend rendering and apply the whole batch in one repaint. The other three components have no effective equivalent: DevExtreme's `beginUpdate()`/`endUpdate()` pair defers option changes but not the re-render inside each task call, Kendo UI exposes no suspend mechanism at all, and Syncfusion accepts arrays for insertion and deletion but has no bulk counterpart for updates. Applying many changes in place therefore costs them roughly one repaint per change.

In practice an application using one of those three would replace the dataset outright instead. Dataset replacement is not measured here. It is also not a free substitution: it discards scroll position, selection and the contents of any open editor, so an application doing it during a background sync has to save and restore that state itself.

<!-- /BENCH:TEST:bulk -->

#### What these results show

**DHTMLX applies the whole batch in under half a second at every tested size with scheduling
disabled.** At 100 000 project-tree tasks that is about four tenths of a second, against about
12 seconds for Bryntum and 3 minutes 25 seconds for Syncfusion. DHTMLX and Bryntum suspend
rendering across the batch and the other three repaint per change, which is part of what this
stress test measures.

**This stress test separates the field at 1 000 tasks, where loading does not.** On the project
tree with scheduling disabled, DHTMLX and Bryntum finish in under a quarter of a second and
Syncfusion in about 3 seconds, while DevExtreme takes about 46 seconds and Kendo UI about
4 minutes — and on the flat chain Kendo UI exceeds the five-minute limit outright. A dataset that
loads in a fraction of a second can therefore still block the page for minutes on a batch of
300 changes.

**With scheduling enabled, DHTMLX completes the 100 000-task batch in about 1.1 seconds on the
project tree and 1.3 seconds on the flat chain.** At 50 000 project-tree tasks Bryntum takes about
13 seconds and Syncfusion about 2 minutes, against half a second for DHTMLX. At 100 000 neither
finishes on the reference machine — Bryntum's tab crashes and Syncfusion never settles — although
Syncfusion does complete that batch in about 4 minutes 16 seconds on Windows.

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
- devextreme, tree, auto-scheduling on — 10 000, 50 000 tasks: bulk failed at 5 000
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

**DHTMLX is the only tested component that produced a figure for every metric, size, shape and
scheduling mode, on both machines.** Bryntum and Syncfusion also complete the whole sequence
through 100 000 tasks in both shapes with scheduling disabled, though their largest edits take
seconds to minutes rather than fractions of a second.

**With scheduling enabled, completion depends on the workload and not on size alone.** Bryntum
loads the 100 000-task project tree but its bulk edit there crashes the browser tab in every run,
and its flat-chain load exceeds the five-minute limit; Syncfusion loads both shapes at every size,
but its flat-chain move fails at 5 000, which leaves the steps after it unmeasured at that size
and above.

**DevExtreme and Kendo UI reach their editing limits well before their loading limits.**
DevExtreme's bulk edit exceeds the five-minute limit at 5 000 tasks with scheduling disabled and at
1 000 on the scheduled flat chain, and its scheduled flat-chain move fails at 5 000; Kendo UI,
which has no auto-scheduling mode, exceeds the limit on the 1 000-task flat-chain batch, the
5 000-task project-tree batch and the 50 000-task move. Neither component loads 100 000 tasks in
either shape.

**The benchmark records how these runs ended, not why.** Two components raise
`Maximum call stack size exceeded` at the same step and size, and one crashes its tab on the
largest scheduled batch; the harness observes the step, the marker and the message, and nothing
that would identify the cause inside the component.

## Cross-machine validation

**The Windows machine supports the conclusions above.** The two machines' fastest groups overlap
in every test but one — heap at 50 000 flat-chain tasks with scheduling enabled, where DevExtreme
does not load on Windows — and no claim in this report rests on an ordering that reverses between
them. Two completion limits are machine-dependent: DevExtreme's 50 000-task flat-chain load
produces figures only on the Mac, and Syncfusion's 100 000-task scheduled project-tree bulk edit
completes only on Windows.

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

- **Some completion limits depend on the machine.** DevExtreme's 50 000-task flat-chain load
  produces figures only on the Mac, which is where its heap comparison at that size comes from, and
  Syncfusion's 100 000-task scheduled project-tree bulk edit completes only on Windows.
- **Two components were measured in a later session.** Bryntum v7.3.6 and Syncfusion v34.2.8 were
  measured twelve days after the other three on both machines, so comparisons between them and the
  rest span sessions rather than one sitting; the `session` column in `results.csv` identifies each.
- **One non-winning ordering reverses between the machines.** Bryntum and Syncfusion swap places on
  the 10 000-task scheduled project-tree move, so this report does not rank those two against each
  other there.

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
