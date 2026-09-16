import {
  scrollElementToBottom,
  tallestScroller,
} from "../../shared/scrollMotion.js";
import {
  BULK_EDIT_OPS,
  bulkBatch,
  buildDataset,
  DEFAULT_SHAPE,
  LEAF_DURATION_DAYS,
  taskDate,
} from "../../shared/dataset.js";

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// Map the shared dataset to DevExtreme fields. Parent dates are loaded rolled up because
// DevExtreme recalculates them on edits rather than on load.
export function generateData(count = 1000, years = 1, shape = DEFAULT_SHAPE) {
  const { nodes, links, fixtures } = buildDataset({ shape, count, years });

  return {
    tasks: nodes.map((node) => ({
      id: node.id,
      parentId: node.parentId ?? 0,
      title: node.name,
      start: taskDate(node.startOffsetDays),
      end: taskDate(node.endOffsetDays),
      progress: node.progressIndex * 10,
    })),
    dependencies: links.map((dependency) => ({
      id: dependency.id,
      predecessorId: dependency.source,
      successorId: dependency.target,
      type: 0,
    })),
    fixtures,
  };
}

// Choose the vertical pane at runtime because DevExtreme exposes two layout candidates.
export function scrollToBottom(root) {
  return scrollElementToBottom(
    tallestScroller(root, ".dx-scrollable-container, .dx-scrollable-content")
  );
}

export async function moveTaskTime(gantt, taskId) {
  const task = gantt.getTaskData(taskId);
  if (!task) {
    throw new Error(`Moving task time test requires task ${taskId}`);
  }

  const duration =
    new Date(task.end).getTime() - new Date(task.start).getTime();
  const start = addMonths(task.start, 1);
  const end = new Date(start.getTime() + duration);

  gantt.updateTask(taskId, { start, end });

}


// DevExtreme validates the fields that changed, and an end change is checked against SF and
// FF predecessors only (`checkEndDependencies`, dx-gantt.js:10709), so this batch validates
// clean and the cascade runs from `moveEndDependTasks` (dx-gantt.js:10725).
//
// DevExtreme's documented bulk pattern is the Component beginUpdate()/endUpdate() pair
// around imperative task calls. It defers *option* changes but does not suppress the
// re-render inside each updateTask/deleteTask/insertTask, so this costs one render per
// change.
export function bulkEdit(gantt, fixtures, count = BULK_EDIT_OPS) {
  const { updateIds, deleteIds, insertParentIds } = bulkBatch(fixtures, count);

  gantt.beginUpdate();
  try {
    for (const id of updateIds) {
      const task = gantt.getTaskData(id);
      if (!task) continue;
      gantt.updateTask(id, {
        title: `Updated ${task.title}`,
        end: addDays(task.end, LEAF_DURATION_DAYS),
      });
    }

    for (const id of deleteIds) {
      if (gantt.getTaskData(id)) gantt.deleteTask(id);
    }

    insertParentIds.forEach((parentId, i) => {
      gantt.insertTask({
        parentId,
        title: `Bulk Task ${i + 1}`,
        start: taskDate(0),
        end: taskDate(LEAF_DURATION_DAYS),
        progress: 0,
      });
    });
  } finally {
    gantt.endUpdate();
  }
}
