import { scrollElementToBottom } from "../../shared/scrollMotion.js";
import {
  BULK_EDIT_OPS,
  bulkBatch,
  buildDataset,
  DEFAULT_SHAPE,
  LEAF_DURATION_DAYS,
  taskDate,
} from "../../shared/dataset.js";

// Bryntum's data API takes a nested tree, so the shared node list is re-nested here; parent
// dates and percentDone remain derived from children.
export function generateProjectData(
  count = 1000,
  years = 1,
  autoScheduling = false,
  shape = DEFAULT_SHAPE
) {
  const { nodes, links, fixtures } = buildDataset({ shape, count, years });

  const byId = new Map();
  const roots = [];

  for (const node of nodes) {
    const task = node.isLeaf
      ? {
          id: node.id,
          name: node.name,
          startDate: taskDate(node.startOffsetDays),
          duration: LEAF_DURATION_DAYS,
          durationUnit: "day",
          percentDone: node.progressIndex * 10,
          manuallyScheduled: !autoScheduling,
        }
      : {
          id: node.id,
          name: node.name,
          expanded: node.expanded,
          children: [],
        };

    byId.set(node.id, task);
    if (node.parentId == null) {
      roots.push(task);
    } else {
      byId.get(node.parentId).children.push(task);
    }
  }

  return {
    tasks: roots,
    dependencies: links.map((dependency) => ({
      id: dependency.id,
      fromTask: dependency.source,
      toTask: dependency.target,
    })),
    fixtures,
  };
}

function findVerticalScroller(gantt) {
  return (
    gantt.element?.querySelector(".b-grid-body-container.b-virtual-scroller") ||
    gantt.element?.querySelector(".b-grid-body-container.b-widget-scroller")
  );
}

export function scrollToBottom(gantt) {
  return scrollElementToBottom(findVerticalScroller(gantt));
}

export async function moveTaskTime(project, taskId) {
  const task = project.taskStore.getById(taskId);
  if (!task?.startDate) {
    throw new Error(`Moving task time test requires task ${taskId}`);
  }

  const shiftedStart = new Date(task.startDate);
  shiftedStart.setMonth(shiftedStart.getMonth() + 1);
  task.startDate = shiftedStart;

  await project.commitAsync();
}


// Bryntum batches through Store.beginBatch()/endBatch(); one commitAsync() then
// settles the scheduling engine for the whole block.
export async function bulkEdit(
  project,
  fixtures,
  count = BULK_EDIT_OPS,
  autoScheduling = false
) {
  const { updateIds, deleteIds, insertParentIds } = bulkBatch(fixtures, count);
  const taskStore = project.taskStore;

  taskStore.beginBatch();
  try {
    for (const id of updateIds) {
      const task = taskStore.getById(id);
      if (!task) continue;
      task.duration += LEAF_DURATION_DAYS;
      task.name = `Updated ${task.name}`;
    }

    const toRemove = deleteIds.map((id) => taskStore.getById(id)).filter(Boolean);
    if (toRemove.length) taskStore.remove(toRemove);

    // Grouped by parent, so insertions spread over several work packages are one
    // appendChild each rather than one per task.
    const insertsByParent = new Map();
    insertParentIds.forEach((parentId, i) => {
      if (!insertsByParent.has(parentId)) insertsByParent.set(parentId, []);
      insertsByParent.get(parentId).push({
        id: `bulk${i + 1}`,
        name: `Bulk Task ${i + 1}`,
        startDate: taskDate(0),
        duration: LEAF_DURATION_DAYS,
        durationUnit: "day",
        percentDone: 0,
        manuallyScheduled: !autoScheduling,
      });
    });

    for (const [parentId, children] of insertsByParent) {
      const parent = taskStore.getById(parentId);
      if (parent) parent.appendChild(children);
    }
  } finally {
    taskStore.endBatch();
  }

  await project.commitAsync();
}
