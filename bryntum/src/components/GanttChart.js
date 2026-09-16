import { Gantt, ProjectModel } from '@bryntum/gantt';
// Bryntum 7 does not bundle the icon font into gantt.css. Without these two imports, the
// widget bootstrap detects no `Font Awesome 6 Free` @font-face and fetches it from a CDN at
// startup, which warns and adds a network fetch inside the measured region.
import "@bryntum/gantt/fontawesome/css/fontawesome.css";
import "@bryntum/gantt/fontawesome/css/solid.css";
import "@bryntum/gantt/gantt.css";
import "@bryntum/gantt/stockholm-light.css";

import { GRID_WIDTH, ROW_HEIGHT } from "../../../shared/layout.js";
import { DEFAULT_SHAPE, requireFixtures } from "../../../shared/dataset.js";
import {
  bulkEdit,
  generateProjectData,
  moveTaskTime,
  scrollToBottom,
} from "../../utils/ganttHelpers.js";

export class GanttChart {
  constructor() {
    this.element = document.createElement("div");
    this.element.id = "gantt-container";

    this.ganttElement = document.createElement("div");
    this.ganttElement.id = "gantt-box";
    this.element.appendChild(this.ganttElement);

    this.autoScheduling = false;
    this.initialized = false;
    this.gantt = null;
    this.fixtures = null;
  }


  async init() {

    if (this.initialized) {
      return;
    }

    this.project = new ProjectModel({
      autoSetConstraints: true,
      tasks: [],
      dependencies: [],
    });

    this.gantt = new Gantt({
      appendTo: this.ganttElement,
      project: this.project,
      startDate: new Date(2026, 2, 1),
      endDate: new Date(2026, 5, 1),
      // Bryntum's default preset is coarser; week over day keeps the timeline comparable.
      viewPreset: "weekAndDay",
      rowHeight: ROW_HEIGHT,
      barMargin: 6,
      subGridConfigs: {
        locked: {
          width: GRID_WIDTH,
        },
      },
      columns: [
        { type: "name", text: "Task name", width: 260 },
        {
          text: "Progress",
          field: "percentDone",
          width: 100,
          editor: false,
          renderer: ({ value }) => `${Math.round(value || 0)}%`,
        },
      ],
    });

    this.initialized = true;
  }

  async setAutoScheduling(value) {
    this.autoScheduling = value;

    if (!this.initialized) {
      return;
    }

    const leafTasks = this.project.taskStore.allRecords.filter(
      (task) => task.isLeaf
    );

    leafTasks.forEach((task) => {
      task.manuallyScheduled = !value;
    });

    await this.project.commitAsync();
  }

  async loadTasks(count, years, shape = DEFAULT_SHAPE) {
    await this.init();

    const { tasks, dependencies, fixtures } = generateProjectData(
      count,
      years,
      this.autoScheduling,
      shape
    );
    this.fixtures = fixtures;

    await this.project.loadInlineData({ tasks, dependencies });
    await this.project.commitAsync();
  }

  async scrollTest() {
    await this.init();

    return scrollToBottom(this.gantt);
  }

  async moveTaskOnly() {
    await this.init();
    await moveTaskTime(this.project, requireFixtures(this.fixtures).moveTaskId);
  }

  async bulkEditOnly(count) {
    await this.init();
    await bulkEdit(this.project, this.fixtures, count, this.autoScheduling);
  }
}
