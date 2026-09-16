# Kendo UI Gantt benchmark app

This directory contains the Kendo UI Gantt app measured by the root benchmark harness. See the
[root README](../README.md) and [measurement methodology](../METHODOLOGY.md#how-the-harness-drives-the-libraries)
for the shared runner and toolbar.

Installed from `@progress/kendo-ui` with `@progress/kendo-theme-default` and jQuery on npm — a
trial build with no licence key registered, so it shows a licence banner and a watermark.

```
npm ci
npm run dev
```

The benchmark settings are documented in [Kendo UI configuration](../CONFIGURATION.md#kendo-ui-gantt);
the app-level implementation is in [`src/components/GanttChart.js`](src/components/GanttChart.js).

Kendo UI Gantt has no auto-scheduling feature, so its auto-scheduling cells are reported as
not applicable rather than filled with the disabled numbers; the [configuration](../CONFIGURATION.md#kendo-ui-gantt)
records the supporting citation.
