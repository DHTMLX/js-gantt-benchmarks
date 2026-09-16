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
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function addMonths(date, months) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

// The payload `updateRecordByID` is given. It writes the record as handed to it, so every
// mapped field has to be present: omitting `parentId` moves the task out from under its
// parent, which is a structural change rather than the edit being measured.
function taskRecord(task) {
  return {
    id: task.id,
    parentId: task.parentId,
    name: task.name,
    startDate: task.startDate,
    endDate: task.endDate,
    duration: task.duration,
    progress: task.progress,
    predecessor: task.predecessor,
    manual: task.manual,
    expanded: task.expanded,
  };
}

// Read the rendered record from `ganttProperties`, which stays current after a cascade.
function currentTask(gantt, id) {
  const record = gantt.getRecordByID(id);
  if (!record) {
    return null;
  }

  const task = record.ganttProperties;
  return {
    id: task.taskId,
    parentId: task.parentId ?? null,
    name: task.taskName,
    startDate: new Date(task.startDate),
    endDate: new Date(task.endDate),
    duration: task.duration,
    progress: task.progress,
    predecessor: task.predecessorsName ?? "",
    manual: !task.isAutoSchedule,
    expanded: record.expanded,
  };
}

// Syncfusion stores dependencies on target tasks and derives summary dates from their
// children under taskMode: "Custom".
export function generateData(
  count = 1000,
  years = 1,
  autoScheduling = false,
  shape = DEFAULT_SHAPE
) {
  const { nodes, links, fixtures } = buildDataset({ shape, count, years });
  const predecessorOf = new Map(
    links.map((dependency) => [dependency.target, `${dependency.source}FS`])
  );

  const tasks = nodes.map((node) => ({
    id: node.id,
    parentId: node.parentId,
    name: node.name,
    startDate: taskDate(node.startOffsetDays),
    endDate: taskDate(node.endOffsetDays),
    ...(node.isLeaf ? { duration: LEAF_DURATION_DAYS } : {}),
    progress: node.progressIndex * 10,
    predecessor: predecessorOf.get(node.id) ?? "",
    manual: node.isLeaf ? !autoScheduling : false,
    expanded: node.expanded,
  }));

  return { tasks, fixtures };
}

// Choose the vertical pane at runtime because Syncfusion exposes several scroll containers.
export function scrollToBottom(root) {
  return scrollElementToBottom(
    tallestScroller(root, ".e-content, .e-chart-scroll-container, .e-scrollbar")
  );
}

export function moveTaskTime(gantt, taskId) {
  const task = currentTask(gantt, taskId);
  if (!task) {
    throw new Error(`Moving task time test requires task ${taskId}`);
  }

  const span = task.endDate.getTime() - task.startDate.getTime();
  task.startDate = addMonths(task.startDate, 1);
  task.endDate = new Date(task.startDate.getTime() + span);

  gantt.updateRecordByID(taskRecord(task));
}


// The payload carries both the new end and the matching duration, since Syncfusion derives
// one from the other and which one it prefers depends on the record.
//
// Syncfusion takes arrays on deleteRecord() and addRecord(), so deletions and insertions
// are one call each. There is no bulk counterpart for updates, so those go one at a time
// through updateRecordByID() and cost one render per record.
export function bulkEdit(gantt, fixtures, count = BULK_EDIT_OPS, autoScheduling = false) {
  const { updateIds, deleteIds, insertParentIds } = bulkBatch(fixtures, count);

  for (const id of updateIds) {
    const task = currentTask(gantt, id);
    if (!task) continue;
    task.endDate = addDays(task.endDate, LEAF_DURATION_DAYS);
    task.duration += LEAF_DURATION_DAYS;
    task.name = `Updated ${task.name}`;
    gantt.updateRecordByID(taskRecord(task));
  }

  const removed = deleteIds.filter((id) => gantt.getRecordByID(id));
  if (removed.length) gantt.deleteRecord(removed);

  gantt.addRecord(
    insertParentIds.map((parentId, i) => ({
      id: `bulk${i + 1}`,
      parentId,
      name: `Bulk Task ${i + 1}`,
      startDate: taskDate(0),
      endDate: taskDate(LEAF_DURATION_DAYS),
      duration: LEAF_DURATION_DAYS,
      progress: 0,
      predecessor: "",
      manual: !autoScheduling,
      expanded: true,
    })),
    "Bottom"
  );
}
