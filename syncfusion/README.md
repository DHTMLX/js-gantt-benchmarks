# Syncfusion Gantt benchmark app

This directory contains the Syncfusion Gantt app measured by the root benchmark harness. See the
[root README](../README.md) and [measurement methodology](../METHODOLOGY.md#how-the-harness-drives-the-libraries)
for the shared runner and toolbar.

Installed from `@syncfusion/ej2-gantt` with the theme from `@syncfusion/ej2` on npm — a trial
build with no licence key registered.

```
npm ci
npm run dev
```

The benchmark settings are documented in [Syncfusion configuration](../CONFIGURATION.md#syncfusion-gantt);
the app-level implementation is in [`src/components/GanttChart.js`](src/components/GanttChart.js).
