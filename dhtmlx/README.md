# DHTMLX Gantt benchmark app

This directory contains the DHTMLX Gantt app measured by the root benchmark harness. See the
[root README](../README.md) and [measurement methodology](../METHODOLOGY.md#how-the-harness-drives-the-libraries)
for the shared runner and toolbar.

Installed from `@dhx/trial-gantt` on DHTMLX's own registry (see [`.npmrc`](.npmrc)) — a trial
build with no licence key registered.

```
npm ci
npm run dev
```

The benchmark settings are documented in [DHTMLX configuration](../CONFIGURATION.md#dhtmlx-gantt);
the app-level implementation is in [`src/components/GanttChart.js`](src/components/GanttChart.js).
