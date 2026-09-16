# JS Gantt performance benchmarks

A reproducible benchmark for JavaScript Gantt components, with participants and scope defined
per round. `README.md` is the entry point.

Conventions for anyone changing this repository:

- Keep the repository description independent of a particular participant count, framework, or
  popularity claim. State each round's eligibility and participants in its report and the README's
  latest-round section. When preparing a new round, review that wording and
  `bench/report-template.md` against the new scope.
- Keep measurement definitions shared by the apps in `shared/`; keep runner and reporting
  configuration in `bench/config.mjs`. Avoid copies of common definitions in individual apps.
- A **library** is a component; an **app** hosts one build and exposes `window.__bench`.
  `apps.json` registers apps and owns their metadata, including ports, packages or versions, and
  DOM selectors. Keep library-specific integration code in the app directories.
- `round-apps.json` selects the apps measured by default and included in generated results.
  `--lib` can measure any registered app; results outside the selection stay in the live store
  but are filtered out of generated results. `npm run check` reports them. Keep registry entries
  for apps that sit out a round.
- Charts assign palette slots in the selected apps' registry order. If a round exceeds the
  palette capacity, extend `SERIES` in `bench/charts.mjs` with distinguishable light and dark
  colours; the generator fails rather than reusing slots.
- Generate tables, charts, `summary.json`, and `BENCH` blocks from the CSV evidence. Edit their
  generators or templates, not generated output. Handwritten report content follows
  `bench/BENCHMARK_REPORT_EDITOR.md`; HTML bundles use the round's own report and charts.
- Keep modules focused and validation proportional. Reject invalid inputs that could change a
  measurement or misrepresent a result. For measurement or adapter changes, verify affected
  behaviour in the browser and inspect the resulting tables; structural checks alone cannot
  establish that components perform comparable work.
- Keep documentation responsibilities distinct: `README.md` covers orientation and commands,
  `METHODOLOGY.md` defines measurements, `CONFIGURATION.md` records settings and asymmetries, and
  `PUBLISHING.md` owns the publication and versioning workflow. Link to the owning document
  instead of duplicating its rules.
- Describe current behaviour directly. Put round-specific findings and limitations in that
  round's report or a section explicitly naming the round.
