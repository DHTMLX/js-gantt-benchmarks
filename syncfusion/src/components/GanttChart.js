import {
  DayMarkers,
  Edit,
  Gantt,
  Selection,
  VirtualScroll,
} from "@syncfusion/ej2-gantt";

// The theme from the installed packages rather than Syncfusion's CDN, so it cannot
// drift from the library version under test. `@syncfusion/ej2` is the aggregate that
// the CDN URL served; the gantt package's own styles/ file omits the styles of the
// components it depends on (TreeGrid, popups, inputs).
import "@syncfusion/ej2/tailwind3.css";

import { GRID_WIDTH, ROW_HEIGHT } from "../../../shared/layout.js";
import {
  DEFAULT_SHAPE,
  isStructuralId,
  requireFixtures,
} from "../../../shared/dataset.js";

import {
  bulkEdit,
  generateData,
  moveTaskTime,
  scrollToBottom,
} from "../../utils/ganttHelpers.js";

Gantt.Inject(DayMarkers, Edit, Selection, VirtualScroll);

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
    this.data = [];
    this.fixtures = null;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    this.gantt = new Gantt({
      height: "calc(100vh - 60px)",
      dataSource: [],
      treeColumnIndex: 0,
      rowHeight: ROW_HEIGHT,
      taskbarHeight: 22,
      highlightWeekends: true,
      allowSelection: true,
      enableVirtualization: true,
      enableTimelineVirtualization: true,
      enablePredecessorValidation: this.autoScheduling,
      validateManualTasksOnLinking: true,
      taskMode: "Custom",
      splitterSettings: {
        columnIndex: 1,
        position: `${GRID_WIDTH}px`,
      },
      timelineSettings: {
        timelineUnitSize: 72,
        topTier: {
          unit: "Week",
          format: "dd MMM yyyy",
        },
        bottomTier: {
          unit: "Day",
          format: "dd",
        },
      },
      editSettings: {
        allowAdding: true,
        allowEditing: true,
        allowDeleting: true,
        allowTaskbarEditing: true,
        mode: "Auto",
      },
      taskFields: {
        id: "id",
        parentID: "parentId",
        name: "name",
        startDate: "startDate",
        endDate: "endDate",
        duration: "duration",
        progress: "progress",
        dependency: "predecessor",
        manual: "manual",
        // Use the dataset's expanded state rather than Syncfusion's default.
        expandState: "expanded",
      },
      columns: [
        {
          field: "name",
          headerText: "Task name",
          width: 260,
        },
        {
          field: "progress",
          headerText: "Progress",
          width: 100,
          template: ({ progress }) => `${Math.round(progress || 0)}%`,
        },
        // updateRecordByID requires an explicit primary key; keep it hidden so visible columns
        // and the splitter layout remain unchanged.
        {
          field: "id",
          headerText: "ID",
          isPrimaryKey: true,
          visible: false,
        },
      ],
      projectStartDate: new Date(2026, 2, 1),
      projectEndDate: new Date(2026, 5, 1),
    });

    this.gantt.appendTo(this.ganttElement);

    this.initialized = true;
  }

  async setAutoScheduling(value) {
    this.autoScheduling = value;

    if (!this.initialized) {
      return;
    }

    if (this.data.length) {
      // Only leaves switch manual mode; summaries continue deriving dates from their children.
      this.data = this.data.map((task) =>
        isStructuralId(task.id) ? task : { ...task, manual: !value }
      );
      this.gantt.dataSource = this.data;
    }

    this.gantt.enablePredecessorValidation = value;
    this.gantt.dataBind();
  }

  async loadTasks(count, years, shape = DEFAULT_SHAPE) {
    await this.init();

    const { tasks, fixtures } = generateData(count, years, this.autoScheduling, shape);
    this.data = tasks;
    this.fixtures = fixtures;

    this.gantt.dataSource = this.data;
    this.gantt.dataBind();
  }

  async scrollTest() {
    await this.init();
    return scrollToBottom(this.ganttElement);
  }

  async moveTaskOnly() {
    await this.init();

    moveTaskTime(this.gantt, requireFixtures(this.fixtures).moveTaskId);
  }

  async bulkEditOnly(count) {
    await this.init();

    bulkEdit(this.gantt, this.fixtures, count, this.autoScheduling);
  }
}
