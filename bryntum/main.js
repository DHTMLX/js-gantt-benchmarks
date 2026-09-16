import { GanttChart } from "./src/components/GanttChart.js";
import { StatsBox } from "./src/components/StatsBox.js";
import { FPSCounter } from "../shared/fpsCounter.js";
import { installBench } from "../shared/benchShim.js";
import { Toolbar } from "../shared/toolbar.js";

const app = document.getElementById("app");
const ganttChart = new GanttChart();
const statsBox = new StatsBox();

const fpsCounter = new FPSCounter({
  callback: (stats) => {
    statsBox.setStats(stats);
  },
  historyDuration: 30,
});

fpsCounter.start();

const bench = installBench({
  chart: ganttChart,
  fpsCounter,
  supportsAutoScheduling: true,
});

const toolbar = new Toolbar({
  bench,
  onStatus: (patch) => statsBox.setData(patch),
});

app.appendChild(toolbar.element);
app.appendChild(ganttChart.element);
document.body.appendChild(statsBox.element);
