# DevExtreme Gantt benchmark app

This directory contains the DevExtreme Gantt app measured by the root benchmark harness. See the
[root README](../README.md) and [measurement methodology](../METHODOLOGY.md#how-the-harness-drives-the-libraries)
for the shared runner and toolbar.

Installed from `devextreme` and `devexpress-gantt` on npm — an evaluation build with no licence
key registered, so it shows an evaluation banner.

```
npm ci
npm run dev
```

The benchmark settings are documented in [DevExtreme configuration](../CONFIGURATION.md#devextreme-gantt);
the app-level implementation is in [`src/components/GanttChart.js`](src/components/GanttChart.js).
