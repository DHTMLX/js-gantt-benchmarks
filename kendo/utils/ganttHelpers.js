import { scrollElementToBottom } from "../../shared/scrollMotion.js";
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

// Map the shared dataset to Kendo fields; summary rows carry the span of their descendants.
export function generateData(count = 1000, years = 1, shape = DEFAULT_SHAPE) {
  const { nodes, links, fixtures } = buildDataset({ shape, count, years });

  return {
    tasks: nodes.map((node, index) => ({
      id: node.id,
      orderId: index,
      parentId: node.parentId,
      title: node.name,
      start: taskDate(node.startOffsetDays),
      end: taskDate(node.endOffsetDays),
      percentComplete: node.progressIndex / 10,
      summary: !node.isLeaf,
      expanded: node.expanded,
    })),
    dependencies: links.map((dependency) => ({
      id: dependency.id,
      predecessorId: dependency.source,
      successorId: dependency.target,
      type: 1,
    })),
    fixtures,
  };
}

export function moveTaskTime(gantt, taskId) {
  const task = gantt.dataSource.get(taskId);
  if (!task) {
    throw new Error(`Moving task time test requires task ${taskId}`);
  }

  const duration =
    new Date(task.end).getTime() - new Date(task.start).getTime();
  const start = new Date(task.start);
  start.setMonth(start.getMonth() + 1);

  gantt.dataSource.update(task, {
    start,
    end: new Date(start.getTime() + duration),
  });
}


export function scrollToBottom(root) {
  return scrollElementToBottom(
    root.querySelector(".k-gantt-timeline-pane .k-grid-content") ||
      root.querySelector(".k-treelist-content")
  );
}


// Kendo exposes no beginUpdate/endUpdate or suspendEvents in this build, and the `batch`
// DataSource option concerns server transport, not client rendering, so edits go through
// individual add/update/remove calls that each refresh the widget. Deleting a task does not
// cascade to its dependencies, so those are removed explicitly — Kendo would otherwise be
// left with dangling links the other libraries clean up themselves.
//
// Each DataSource operation can refresh the widget. In the flat shape all deleted leaves share
// one high-fanout parent; in the tree shape they are distributed across bounded-fanout work
// packages. This is Kendo UI's documented in-place edit path, so the benchmark keeps it
// rather than substituting a full dataset replacement.
export function bulkEdit(gantt, fixtures, count = BULK_EDIT_OPS) {
  const { updateIds, deleteIds, insertParentIds } = bulkBatch(fixtures, count);
  const tasks = gantt.dataSource;
  const dependencies = gantt.dependencies;

  for (const id of updateIds) {
    const task = tasks.get(id);
    if (!task) continue;
    tasks.update(task, {
      end: addDays(task.end, LEAF_DURATION_DAYS),
      title: `Updated ${task.title}`,
    });
  }

  for (const id of deleteIds) {
    const task = tasks.get(id);
    if (!task) continue;
    dependencies
      .dependencies(task.id)
      .slice()
      .forEach((dependency) => dependencies.remove(dependency));
    tasks.remove(task);
  }

  let nextId = 0;
  tasks.data().forEach((task) => {
    if (Number.isFinite(task.id)) nextId = Math.max(nextId, task.id);
  });

  insertParentIds.forEach((parentId, i) => {
    tasks.add({
      id: ++nextId,
      parentId,
      title: `Bulk Task ${i + 1}`,
      start: taskDate(0),
      end: taskDate(LEAF_DURATION_DAYS),
      percentComplete: 0,
      summary: false,
      expanded: true,
    });
  });
}
