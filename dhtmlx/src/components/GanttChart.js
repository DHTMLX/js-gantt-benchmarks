import { gantt } from "@dhx/trial-gantt";
import "@dhx/trial-gantt/codebase/dhtmlxgantt.css";

import { GRID_WIDTH, ROW_HEIGHT } from "../../../shared/layout.js";
import { DEFAULT_SHAPE, requireFixtures } from "../../../shared/dataset.js";

import {
  bulkEdit,
  generateData,
  moveTaskTime,
  scrollToBottom,
} from "../../utils/ganttHelpers";

export class GanttChart {
  constructor() {
    this.element = document.createElement("div");
    this.element.id = "gantt-container";

    this.ganttElement = document.createElement("div");
    this.ganttElement.id = "gantt-box";
    this.ganttElement.style.height = "calc(100vh - 60px)";
    this.element.appendChild(this.ganttElement);

    this.autoScheduling = false;
    this.initialized = false;
    this.fixtures = null;
  }

  init() {
    if (this.initialized) {
      return;
    }

    gantt.plugins({
      auto_scheduling: true,
    });
    // DHTMLX derives the grid width from its columns; keep both totals at GRID_WIDTH so the
    // first frame uses the same layout as the other apps.
    gantt.config.grid_width = GRID_WIDTH;
    gantt.config.columns=[
      { name: "text", label: "Name", tree: true, width: GRID_WIDTH - 100 },
      {
        name: 'progress', label: 'Progress', width: 100, template: function(obj){
          return `${obj.progress*100}%`
        }
      },
    ];
    gantt.config.start_date = new Date(2026, 2, 1);
    gantt.config.end_date = new Date(2026, 5, 1);
    gantt.config.show_tasks_outside_timescale = true;
    // Week over day, matching the other apps and DHTMLX's default granularity.
    gantt.config.scales = [
      { unit: "week", step: 1, format: "%d %M" },
      { unit: "day", step: 1, format: "%d" },
    ];
    gantt.config.row_height = ROW_HEIGHT;
    this.applyAutoSchedulingConfig();
    gantt.init(this.ganttElement.id);
    this.initialized = true;
  }

  applyAutoSchedulingConfig() {
    gantt.config.auto_scheduling = {
      ...(typeof gantt.config.auto_scheduling === "object"
        ? gantt.config.auto_scheduling
        : {}),
      enabled: this.autoScheduling,
    };
  }

  setAutoScheduling(value) {
    this.autoScheduling = value;
    this.applyAutoSchedulingConfig();

    if (this.initialized) {
      gantt.render();
    }
  }

  loadTasks(count, years, shape = DEFAULT_SHAPE) {
    this.init();
    gantt.clearAll();

    const { tasks, links, fixtures } = generateData(count, years, shape);
    this.fixtures = fixtures;

    gantt.parse({ tasks, links });
  }

  scrollTest() {
    this.init();

    return scrollToBottom(gantt);
  }

  moveTaskOnly() {
    this.init();
    moveTaskTime(gantt, requireFixtures(this.fixtures).moveTaskId, this.autoScheduling);
  }

  bulkEditOnly(count) {
    this.init();
    bulkEdit(gantt, this.fixtures, count, this.autoScheduling);
  }
}
