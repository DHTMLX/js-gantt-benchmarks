import { scrollElementToBottom } from "../../shared/scrollMotion.js";
import {
  BULK_EDIT_OPS,
  bulkBatch,
  buildDataset,
  DEFAULT_SHAPE,
  LEAF_DURATION_DAYS,
  taskDate,
} from "../../shared/dataset.js";

// Map the shared dataset to DHTMLX fields; project dates remain derived from their children.
export function generateData(count, years, shape = DEFAULT_SHAPE) {
  const { nodes, links, fixtures } = buildDataset({
    shape,
    count: count || 1000,
    years: years || 1,
  });

  const tasks = nodes.map((node) => ({
    id: node.id,
    text: node.name,
    start_date: taskDate(node.startOffsetDays),
    end_date: taskDate(node.endOffsetDays),
    progress: node.progressIndex / 10,
    parent: node.parentId ?? 0,
    type: node.isLeaf ? "task" : "project",
    open: node.expanded,
  }));

  return {
    tasks,
    links: links.map((dependency) => ({
      id: dependency.id,
      source: dependency.source,
      target: dependency.target,
      type: "0",
    })),
    fixtures,
  };
}

// One proxy scrollbar drives both DHTMLX's grid and timeline.
export function scrollToBottom(ganttInstance) {
  return scrollElementToBottom(
    ganttInstance.$root?.querySelector(".gantt_ver_scroll")
  );
}


export function moveTaskTime(ganttInstance, taskId, autoScheduling = false) {
  if (!ganttInstance.isTaskExists(taskId)) {
    throw new Error(`Moving task time test requires task ${taskId}`);
  }

  const task = ganttInstance.getTask(taskId);
  task.start_date = ganttInstance.date.add(task.start_date, 1, "month");
  task.end_date = ganttInstance.calculateEndDate(task);
  ganttInstance.updateTask(taskId);

  if (autoScheduling) {
    ganttInstance.autoSchedule(taskId);
  }
}


// DHTMLX batches through gantt.batchUpdate(): one render for the whole block.
// Programmatic updateTask() does not auto-schedule, so enabled bulk edits finish with one
// gantt.autoSchedule() call inside the batch.
export function bulkEdit(
  ganttInstance,
  fixtures,
  count = BULK_EDIT_OPS,
  autoScheduling = false
) {
  const { updateIds, deleteIds, insertParentIds } = bulkBatch(fixtures, count);

  ganttInstance.batchUpdate(() => {
    for (const id of updateIds) {
      if (!ganttInstance.isTaskExists(id)) continue;
      const task = ganttInstance.getTask(id);
      task.duration += LEAF_DURATION_DAYS;
      task.end_date = ganttInstance.calculateEndDate(task);
      task.text = `Updated ${task.text}`;
      ganttInstance.updateTask(id);
    }

    for (const id of deleteIds) {
      if (ganttInstance.isTaskExists(id)) ganttInstance.deleteTask(id);
    }

    insertParentIds.forEach((parent, i) => {
      ganttInstance.addTask({
        id: `bulk${i + 1}`,
        text: `Bulk Task ${i + 1}`,
        start_date: taskDate(0),
        duration: LEAF_DURATION_DAYS,
        parent,
        type: "task",
      });
    });

    if (autoScheduling) {
      ganttInstance.autoSchedule();
    }
  });
}
