# Bryntum Gantt benchmark app

This directory contains the Bryntum Gantt app measured by the root benchmark harness. See the
[root README](../README.md) and [measurement methodology](../METHODOLOGY.md#how-the-harness-drives-the-libraries)
for the shared runner and toolbar.

Installed from `@bryntum/gantt-trial` on npm, aliased to `@bryntum/gantt` — a trial build with no
licence key registered.

```
npm ci
npm run dev
```

The benchmark settings are documented in [Bryntum configuration](../CONFIGURATION.md#bryntum-gantt);
the app-level implementation is in [`src/components/GanttChart.js`](src/components/GanttChart.js).
