import { $, kendo } from "../kendoRuntime.js";

import { GRID_WIDTH, ROW_HEIGHT } from "../../../shared/layout.js";
import { DEFAULT_SHAPE, requireFixtures } from "../../../shared/dataset.js";

import {
  bulkEdit,
  generateData,
  moveTaskTime,
  scrollToBottom
} from "../../utils/ganttHelpers";

export class GanttChart {
  constructor() {
    this.element = document.createElement("div");
    this.element.id = "gantt-container";

    this.ganttElement = document.createElement("div");
    this.ganttElement.id = "gantt-box";
    this.ganttElement.style.height = "calc(100vh - 60px)";
    this.element.appendChild(this.ganttElement);

    this.initialized = false;
    this.ganttInstance = null;
    this.fixtures = null;
  }

  init() {
    if (this.initialized) {
      return;
    }

    this.ganttInstance = $(this.ganttElement).kendoGantt({
      height: "100%",
      dataSource: new kendo.data.GanttDataSource({
        autoSync: false,
        data: []
      }),
      dependencies: new kendo.data.GanttDependencyDataSource({
        autoSync: false,
        data: []
      }),
      editable: true,
      navigatable: true,
      rowHeight: ROW_HEIGHT,
      // Pin the task list at the shared 380 px width; Kendo's default is 30% (475 px here).
      listWidth: `${GRID_WIDTH}px`,
      // Include weekends so Kendo renders the same seven-day timeline as the other apps.
      showWorkDays: false,
      // Kendo's `week` view is week over day; its `day` view shows hour slots within one day.
      views: [{ type: "week", selected: true }],
      range: {
        start: new Date(2026, 2, 1),
        end: new Date(2026, 5, 1)
      },
      columns: ["title" , "percentComplete"]
    }).data("kendoGantt");

    this.initialized = true;
  }

  loadTasks(count, years, shape = DEFAULT_SHAPE) {
    this.init();
    const { tasks, dependencies, fixtures } = generateData(count, years, shape);
    this.fixtures = fixtures;

    this.ganttInstance.dataSource.data([]);
    this.ganttInstance.dependencies.data([]);

    // Load tasks before dependencies so dependency geometry has task coordinates.
    this.ganttInstance.dataSource.data(tasks);
    this.ganttInstance.dependencies.data(dependencies);
  }

  scrollTest() {
    this.init();

    return scrollToBottom(this.ganttInstance.element[0]);
  }

  moveTaskOnly() {
    this.init();

    return moveTaskTime(this.ganttInstance, requireFixtures(this.fixtures).moveTaskId);
  }

  bulkEditOnly(count) {
    this.init();

    bulkEdit(this.ganttInstance, this.fixtures, count);
  }
}
