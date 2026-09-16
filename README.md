# JavaScript Gantt chart performance benchmark

A reproducible benchmark for JavaScript Gantt components. The benchmark measures loading,
rendering, memory, scrolling, task updates and bulk edits across two synthetic workloads.

**Disclosure:** DHTMLX publishes this benchmark and is one of the products tested. Versions,
configuration, raw results and [known asymmetries](CONFIGURATION.md#known-asymmetries) are
included here; the report's generated content and narrative follow the published
[`bench/BENCHMARK_REPORT_EDITOR.md`](bench/BENCHMARK_REPORT_EDITOR.md) rules.

## Latest benchmark

Round v1.0.0 compares five vanilla JavaScript Gantt components.

<!-- BENCH:SUMMARY -->

### Round v1.0.0

- 5 libraries, 2 dataset shapes and 6 metrics, with auto-scheduling disabled and enabled where the component supports it.
- Complete matrix: 1,000, 5,000, 10,000, 50,000, and 100,000 tasks.
- Reference machine MacBook Air M1 (`Apple-M1-mac`) — Apple M1, RAM 16 GB, darwin 24.6.0, Chromium 151.0.7922.34, 60 Hz display. Each figure is the median of the runs that produced one, out of 3 independent fresh-browser runs of every test; where a figure came from fewer, the count is printed beside it. Reference data updated `2026-09-15`.

[`Full report`](reports/1.0.0/report-v1.0.0.md) · [`Machine-readable results`](reports/1.0.0/summary.json) · [`Raw measurements`](reports/1.0.0/raw-results/)

<!-- /BENCH:SUMMARY -->

### Fastest component per test

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

The table shows the best median and every component within 25% of it; names in the same group are
not meaningfully separated by this benchmark. *Nobody finished* means no component completed
that test at that size.

It shows one shape at three sizes for readability; the
[round report](reports/1.0.0/report-v1.0.0.md) covers both shapes, all sizes and failures.

## Libraries measured

<!-- BENCH:LIBRARIES -->

- [**DHTMLX Gantt** v10.0.3](https://dhtmlx.com/docs/products/dhtmlxGantt/)
- [**Bryntum Gantt** v7.3.6](https://www.bryntum.com/products/gantt/)
- [**DevExtreme Gantt** v26.1.4](https://js.devexpress.com/jQuery/Documentation/Guide/UI_Components/Gantt/Overview/)
- [**Kendo UI Gantt** v2026.3.811](https://www.telerik.com/kendo-jquery-ui/gantt)
- [**Syncfusion Gantt** v34.2.8](https://ej2.syncfusion.com/documentation/gantt/overview)

<!-- /BENCH:LIBRARIES -->

Every component is an exact install-time npm dependency installed with `npm ci`. Measurable apps
are registered in [`apps.json`](apps.json); a round selects its apps in
[`round-apps.json`](round-apps.json). All builds are trial or evaluation builds without licence
keys, so banners and watermarks remain part of the page. See
[`CONFIGURATION.md`](CONFIGURATION.md#editions-and-delivery) for package details.

## What is measured

- Six metrics: readiness, first paint, retained JavaScript heap, scrolling FPS, moving a task,
  and a bulk edit.
- Two workloads: a flat dependency chain and a four-level project tree, each from 1,000 to
  100,000 tasks, with auto-scheduling off and on where supported.
- Fixed viewport, timeline, row height and grid width; virtualization is enabled where available.
- Operations run to UI quiescence. A step over five minutes is a failure, not a large value.
- Figures are medians from fresh-browser runs; differences within 25% are comparable.

See [`METHODOLOGY.md`](METHODOLOGY.md) for measurement details and
[`CONFIGURATION.md`](CONFIGURATION.md) for the dataset, settings and known asymmetries.

## Running it yourself

```sh
npm ci                                      # install the harness
npm run setup                               # install Chromium and each benchmark app
npm run bench:smoke                         # verify the harness
npm run bench                               # run the full matrix
```

Read [Machine prerequisites](METHODOLOGY.md#machine-prerequisites) first. A full run takes
hours and requires an awake machine with an active display; `bench:quick` is a three-size
pre-flight. Partial reruns merge into the machine's existing results, while `bench:smoke` uses
the throwaway `raw-results/smoke/` store.

Each library directory has an interactive `npm run dev` demo. Its toolbar drives the same
operations as the runner, including `Run cell`; see
[How the harness drives the libraries](METHODOLOGY.md#how-the-harness-drives-the-libraries).

### Docker with Xvfb

The Docker image runs headed Chromium against a 1600 x 900 Xvfb display and records it as the
separate `docker-xvfb` machine. Persist the generated CSVs by mounting `raw-results`:

```sh
docker build -t gantt-benchmarks .
docker run --rm --init --ipc=host \
  --mount type=bind,source="$(pwd)/raw-results",target=/benchmark/raw-results \
  gantt-benchmarks
```

The image runs the full matrix by default. Override its command for a smoke test:

```sh
docker run --rm --init --ipc=host \
  --mount type=bind,source="$(pwd)/raw-results",target=/benchmark/raw-results \
  gantt-benchmarks npm run bench:smoke -- --machine docker-xvfb-smoke
```

Xvfb measurements use a virtual display; interpret their FPS column under the
[documented display limitation](METHODOLOGY.md#what-this-measurement-cannot-see).

## Documentation and data

| What | Where |
|---|---|
| Every app that can be measured, and from which packages | [`apps.json`](apps.json) |
| Which of them this round measures | [`round-apps.json`](round-apps.json) |
| Versioned reports, charts and conclusions | [`reports/`](reports/) |
| Current raw measurements by machine | [`raw-results/`](raw-results/) |
| How each metric is measured | [`METHODOLOGY.md`](METHODOLOGY.md) |
| Dataset, configuration and known asymmetries | [`CONFIGURATION.md`](CONFIGURATION.md) |
| Turning a measured store into a published round | [`PUBLISHING.md`](PUBLISHING.md) |

Report tables and charts are generated from committed CSVs. `raw-results/` is the live store;
publishing freezes a copy beside the report. See [`PUBLISHING.md`](PUBLISHING.md).

`npm run report` also fills the report's `BENCH:LIBRARIES` block with the measured versions
and library links, using the same list renderer as `npm run readme`. Existing drafts need this
marker pair from [`bench/report-template.md`](bench/report-template.md).

## Scope and limitations

- Synthetic performance workloads only; features, API quality, framework integration, support
  and licensing are out of scope.
- Measurements use headed Chromium on reference machines; shared CI runners lack valid FPS
  display timing.
- Commercial components are installed from npm and are not redistributed here.

## Corrections

Problems with the configuration or the measurements are worth reporting — open a GitHub issue,
ideally naming the setting, the metric or the published figure. Corrected figures go into the
live `raw-results/` store and appear in the next round; a published round keeps the numbers it
was generated from, so a correction is an erratum in the round that follows rather than an edit
to one already out.

## License

MIT — see [`LICENSE`](LICENSE). The measured components are third-party software, installed
from their own registries and not redistributed here; each remains under its vendor's licence.
