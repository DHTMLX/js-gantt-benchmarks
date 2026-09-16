import { GRID_WIDTH, ROW_HEIGHT } from "../../../shared/layout.js";
import { DEFAULT_SHAPE, requireFixtures } from "../../../shared/dataset.js";

import {
  bulkEdit,
  generateData,
  moveTaskTime,
  scrollToBottom,
} from "../../utils/ganttHelpers.js";

import $ from "jquery";
import "devextreme/integration/jquery";
import "devextreme/ui/gantt";

import "devexpress-gantt/dist/dx-gantt.css";
import "devextreme/dist/css/dx.light.css";

// Shared time window; DevExtreme needs the bounds in both the widget and its viewport reset.
const TIMELINE_START = new Date(2026, 2, 1);
const TIMELINE_END = new Date(2026, 5, 1);

export class GanttChart {
	constructor() {
		this.element = document.createElement("div");
		this.element.id = "gantt-container";

		this.ganttElement = document.createElement("div");
		this.ganttElement.id = "gantt-box";
		this.element.appendChild(this.ganttElement);

		// DevExtreme Gantt exposes no rowHeight option: it measures the task list's own
		// row height and propagates that to the timeline, so CSS is the only way to pin
		// it. Fed from shared/layout.js rather than typed into style.css, so the value
		// stays in one place.
		this.element.style.setProperty("--bench-row-height", `${ROW_HEIGHT}px`);

		this.autoScheduling = false;
		this.initialized = false;
		this.data = {
			tasks: [],
			dependencies: [],
		};
		this.gantt = null;
		this.fixtures = null;
	}

	async init() {
		if (this.initialized) {
			return;
		}

		this.gantt = $(this.ganttElement)
			.dxGantt({
				startDateRange: TIMELINE_START,
        		endDateRange: TIMELINE_END,
				// Day scale gives DevExtreme the same roughly 92 timeline columns as the other apps.
				scaleType: "days",
				taskListWidth: GRID_WIDTH,
				rootValue: 0,
				height: "calc(100vh - 60px)",
				// `autoUpdateParentTasks` is DevExtreme's parent rollup. It is on because the
				// dataset has a summary root, and the other four libraries derive a parent's
				// dates from its children inherently — off, DevExtreme alone would skip that
				// work on every edit.
				validation: {
					validateDependencies: this.autoScheduling,
					autoUpdateParentTasks: true,
					enablePredecessorGap: this.autoScheduling,
				},
				editing: {
					enabled: true,
				},
				columns: [
					{
						dataField: "title",
						caption: "Task name",
						width: 260,
					},
					{
						dataField: "progress",
						caption: "Progress",
						width: 100,
					},
				],
				tasks: {
					dataSource: [],
					keyExpr: "id",
					parentIdExpr: "parentId",
					titleExpr: "title",
					progressExpr: "progress",
					startExpr: "start",
					endExpr: "end",
				},
				dependencies: {
					dataSource: [],
					keyExpr: "id",
					predecessorIdExpr: "predecessorId",
					successorIdExpr: "successorId",
					typeExpr: "type",
				},
			})
			.dxGantt("instance");

		this.initialized = true;
	}

	async setAutoScheduling(value) {
		this.autoScheduling = value;

		if (!this.initialized) {
			return;
		}

		this.gantt.option("validation", {
			validateDependencies: value,
			autoUpdateParentTasks: true,
			enablePredecessorGap: value,
		});
	}

	async loadTasks(count, years, shape = DEFAULT_SHAPE) {
		await this.init();

		const { tasks, dependencies, fixtures } = generateData(count, years, shape);
		this.data = { tasks, dependencies };
		this.fixtures = fixtures;

		// Not wrapped in beginUpdate()/endUpdate(), which the bulk-edit test does use:
		// the pair locks option processing until endUpdate rather than coalescing it, and
		// each dataSource assignment still starts its own data-source refresh either way
		// (`_optionChanged` -> `_refreshDataSource`). Wrapping these two assignments was
		// measured against leaving them bare and made no difference outside run-to-run
		// noise, so the plain calls stand. See METHODOLOGY.md on the batching mechanisms.
		this.gantt.option("tasks.dataSource", this.data.tasks);
		this.gantt.option("dependencies.dataSource", this.data.dependencies);

		// Expansion state comes from the dataset, and DevExtreme expresses it as a method
		// rather than as a task field — so the neutral `expanded: true` on every summary is
		// applied here. Inside the timed region, because rendering the complete tree is what
		// every library is being measured on.
		this.gantt.expandAll();

		// DevExtreme opens near the right edge of the timeline by default — an empty region
		// on a day scale — while the other four libraries open at the left edge where the
		// tasks are. Scrolled here so every library renders the same starting viewport;
		// the call is inside the timed region because getting there is part of the work.
		this.gantt.scrollToDate(TIMELINE_START);
	}

	async scrollTest() {
		await this.init();
		return scrollToBottom(this.ganttElement);
	}

	async moveTaskOnly() {
		await this.init();
		await moveTaskTime(this.gantt, requireFixtures(this.fixtures).moveTaskId);
	}

	async bulkEditOnly(count) {
		await this.init();
		bulkEdit(this.gantt, this.fixtures, count);
	}
}
