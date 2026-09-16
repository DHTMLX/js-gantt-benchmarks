// Shared neutral dataset and edit fixtures. Both shapes produce exactly `count` records;
// adapters map the neutral nodes to their own field names.

export const SHAPE_IDS = ["flat", "tree"];

export const DEFAULT_SHAPE = "flat";

// Structural nodes — the root, and in `tree` the projects and work packages — take ids from
// -1 downwards in document order, a range that can never collide with a leaf id (1..n) or
// with an id a library generates for a task inserted by the bulk-edit test. Non-zero,
// because more than one of these libraries treats a falsy parent id as "no parent" —
// DevExtreme's `rootValue` is 0.
export const ROOT_ID = -1;

/** True for the root, and for a project or work package in the `tree` shape. */
export const isStructuralId = (id) => typeof id === "number" && id < 0;

// Keep project fanout constant as dataset size grows.
export const WORK_PACKAGES_PER_PROJECT = 10;
export const LEAVES_PER_WORK_PACKAGE = 10;

// One complete project subtree: one project, ten work packages, and 100 leaves.
export const PROJECT_SUBTREE_RECORDS =
  1 + WORK_PACKAGES_PER_PROJECT * (1 + LEAVES_PER_WORK_PACKAGE);

// Bulk-edit operation count; fixtures below are generated at this size.
export const BULK_EDIT_OPS = 100;

// Disjoint fixture bands shared by both shapes; all exist at the smallest measured size.
export const MOVE_LEAF = 3;
export const BULK_UPDATE_FIRST_LEAF = 101;
export const BULK_INSERT_FIRST_LEAF = 301;
export const BULK_DELETE_FIRST_LEAF = 501;

// Every leaf is two days long; summary dates span their descendants.
export const LEAF_DURATION_DAYS = 2;

const START_YEAR = 2026;
const START_MONTH = 2; // March, zero-based as Date takes it
const START_DAY = 2;

/**
 * A dataset date from a day offset. One definition, so a given record starts on the same
 * day in every library and in both shapes.
 */
export const taskDate = (offsetDays) =>
  new Date(START_YEAR, START_MONTH, START_DAY + offsetDays);

// Date offsets are keyed by leaf ordinal so both shapes place corresponding leaves alike.
function leafStartOffset(ordinal, years) {
  const day = ordinal % (365 * years);
  return day >= 13 ? day - 12 : day;
}

/**
 * How the records under the portfolio root are divided into projects: one array of leaf
 * counts per project, one entry per work package.
 *
 * Complete subtrees while there are enough records for them, then one partial subtree that
 * consumes the remainder, so the total lands on `count` exactly at every size. The partial
 * subtree takes as few work packages as can hold its leaves and spreads them evenly, which
 * keeps every work package non-empty.
 */
function projectPlan(records) {
  const complete = Math.floor(records / PROJECT_SUBTREE_RECORDS);
  const remainder = records - complete * PROJECT_SUBTREE_RECORDS;

  const projects = Array.from({ length: complete }, () =>
    Array(WORK_PACKAGES_PER_PROJECT).fill(LEAVES_PER_WORK_PACKAGE)
  );

  if (remainder >= 3) {
    const packages = Math.ceil((remainder - 1) / (LEAVES_PER_WORK_PACKAGE + 1));
    const leaves = remainder - 1 - packages;
    const base = Math.floor(leaves / packages);
    const extra = leaves % packages;
    projects.push(
      Array.from({ length: packages }, (unused, i) => base + (i < extra ? 1 : 0))
    );
  } else if (remainder > 0) {
    // One or two records left over cannot form a project of their own — a project needs a
    // work package and a work package needs a leaf — so they join the last work package.
    projects.at(-1)[WORK_PACKAGES_PER_PROJECT - 1] += remainder;
  }

  return projects;
}

/** Leaf ids `first`, `first + 1`, … while they exist. */
function leafRange(first, howMany, leafTotal) {
  const ids = [];
  for (let id = first; id < first + howMany && id <= leafTotal; id++) {
    ids.push(id);
  }
  return ids;
}

const packageIndexOf = (workPackages, leafId) =>
  Math.max(
    0,
    workPackages.findIndex(
      (wp) => wp.leafIds.length && wp.leafIds[0] <= leafId && leafId <= wp.leafIds.at(-1)
    )
  );

/**
 * The first half of each work package's leaves, walking work packages from `from`.
 *
 * Every touched work package therefore keeps children. Deleting a whole subtree is a
 * different operation and is not what the bulk-edit metric measures.
 */
function halfOfEachPackage(workPackages, from, ops) {
  const ids = [];
  for (let i = 0; i < workPackages.length && ids.length < ops; i++) {
    const wp = workPackages[(from + i) % workPackages.length];
    const take = Math.min(Math.floor(wp.leafIds.length / 2), ops - ids.length);
    ids.push(...wp.leafIds.slice(0, take));
  }
  return ids;
}

/**
 * The dataset, as a neutral structure every app maps to its own field names.
 *
 * `nodes` are in document order — a parent before everything beneath it — which is the order
 * the rows are rendered in and the order a flat-list library can be handed directly.
 *
 *   { id, parentId, level, isLeaf, expanded, name, startOffsetDays, endOffsetDays,
 *     progressIndex }
 *
 * `parentId` is null at the top level, because what a library wants there differs: 0 for
 * DHTMLX and DevExtreme, null for Kendo UI and Syncfusion, nesting for Bryntum.
 *
 * `links` are finish-to-start throughout; each app supplies its own type constant.
 *
 * `fixtures` are the ids the move and bulk-edit tests act on, so every library receives the
 * same target records instead of each adapter rediscovering them.
 */
export function buildDataset({
  shape = DEFAULT_SHAPE,
  count = 1000,
  years = 1,
  ops = BULK_EDIT_OPS,
} = {}) {
  if (!SHAPE_IDS.includes(shape)) {
    throw new Error(
      `unknown dataset shape "${shape}" — expected one of ${SHAPE_IDS.join(", ")}`
    );
  }
  const minimum = shape === "tree" ? 4 : 2;
  if (!Number.isInteger(count) || count < minimum) {
    throw new Error(
      `the ${shape} shape needs at least ${minimum} records, got ${count}`
    );
  }

  const nodes = [];
  const links = [];

  let nextStructuralId = ROOT_ID;
  let leafOrdinal = 0;
  let nextLinkId = 0;

  const structural = (parentId, level, name) => {
    const node = {
      id: nextStructuralId--,
      parentId,
      level,
      isLeaf: false,
      // Every summary is initially expanded: the benchmark deliberately renders the
      // complete tree. Mapped explicitly by every adapter rather than left to a library
      // default, so the row count each library paints is the one this file describes.
      expanded: true,
      name,
      // Filled by the rollup below, from everything beneath it.
      startOffsetDays: Infinity,
      endOffsetDays: -Infinity,
      progressIndex: 0,
    };
    nodes.push(node);
    return node;
  };

  const leaf = (parentId, level) => {
    const ordinal = ++leafOrdinal;
    const startOffsetDays = leafStartOffset(ordinal, years);
    const node = {
      id: ordinal,
      parentId,
      level,
      isLeaf: true,
      expanded: true,
      name: `Task ${ordinal}`,
      startOffsetDays,
      endOffsetDays: startOffsetDays + LEAF_DURATION_DAYS,
      progressIndex: ordinal % 10,
    };
    nodes.push(node);
    return node;
  };

  const link = (source, target) => {
    links.push({ id: ++nextLinkId, source, target });
  };

  const workPackages = [];

  if (shape === "flat") {
    const root = structural(null, 1, "Tasks");
    const leaves = count - 1;
    for (let i = 0; i < leaves; i++) {
      leaf(root.id, 2);
    }
    for (let id = 2; id <= leaves; id++) {
      link(id - 1, id);
    }
  } else {
    const root = structural(null, 1, "Portfolio");
    projectPlan(count - 1).forEach((packageSizes, p) => {
      const project = structural(root.id, 2, `Project ${p + 1}`);
      let previousPackageLastLeaf = null;

      packageSizes.forEach((leafTotal, j) => {
        const pkg = structural(project.id, 3, `Work package ${p + 1}.${j + 1}`);
        const leafIds = [];
        for (let k = 0; k < leafTotal; k++) {
          leafIds.push(leaf(pkg.id, 4).id);
        }
        workPackages.push({ id: pkg.id, leafIds });

        // Keep the cascade within a project while chaining adjacent packages.
        if (previousPackageLastLeaf != null && leafIds.length) {
          link(previousPackageLastLeaf, leafIds[0]);
        }
        for (let k = 1; k < leafIds.length; k++) {
          link(leafIds[k - 1], leafIds[k]);
        }
        if (leafIds.length) {
          previousPackageLastLeaf = leafIds.at(-1);
        }
      });
    });
  }

  // A single reverse pass over document order gives every summary the span of everything
  // beneath it, because a parent always precedes its descendants. The libraries that derive
  // a parent's dates themselves ignore these; DevExtreme and Kendo UI roll a parent up in
  // response to an edit rather than on load, so they have to be handed the rolled-up value
  // or their summary bars would start out wrong and correct themselves on the first edit.
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (let i = nodes.length - 1; i > 0; i--) {
    const node = nodes[i];
    const parent = node.parentId == null ? null : byId.get(node.parentId);
    if (!parent) continue;
    parent.startOffsetDays = Math.min(parent.startOffsetDays, node.startOffsetDays);
    parent.endOffsetDays = Math.max(parent.endOffsetDays, node.endOffsetDays);
  }
  for (const node of nodes) {
    if (!Number.isFinite(node.startOffsetDays)) {
      node.startOffsetDays = 0;
      node.endOffsetDays = LEAF_DURATION_DAYS;
    }
  }

  // Structural nodes count toward the published size in both shapes.
  if (nodes.length !== count) {
    throw new Error(
      `${shape} generator produced ${nodes.length} records for a size of ${count}`
    );
  }

  const leafTotal = leafOrdinal;
  const fixtures =
    shape === "flat"
      ? {
          moveTaskId: MOVE_LEAF,
          updateIds: leafRange(BULK_UPDATE_FIRST_LEAF, ops, leafTotal),
          deleteIds: leafRange(BULK_DELETE_FIRST_LEAF, ops, leafTotal),
          insertParentIds: Array(ops).fill(ROOT_ID),
        }
      : {
          moveTaskId: MOVE_LEAF,
          updateIds: leafRange(BULK_UPDATE_FIRST_LEAF, ops, leafTotal),
          deleteIds: halfOfEachPackage(
            workPackages,
            packageIndexOf(workPackages, BULK_DELETE_FIRST_LEAF),
            ops
          ),
          insertParentIds: (() => {
            const from = packageIndexOf(workPackages, BULK_INSERT_FIRST_LEAF);
            const parents = Array.from(
              { length: Math.min(WORK_PACKAGES_PER_PROJECT, workPackages.length) },
              (unused, i) => workPackages[(from + i) % workPackages.length].id
            );
            return Array.from(
              { length: ops },
              (unused, i) => parents[i % parents.length]
            );
          })(),
        };

  return { shape, count, nodes, links, fixtures };
}

/**
 * The fixtures, or a clear error rather than a confusing failure inside a library call.
 * Every edit test acts on ids the generator chose, so it needs a loaded dataset.
 */
export function requireFixtures(fixtures) {
  if (!fixtures) {
    throw new Error("the edit tests need the dataset fixtures — load a dataset first");
  }
  return fixtures;
}

/**
 * The batch the bulk-edit test applies: the fixtures, cut to the requested size.
 *
 * Updates are applied last-record-first. A dependency cascade runs downstream, so in
 * reverse order each record is still where the dataset put it when its edit lands —
 * "extend each record by one leaf duration", not "extend from wherever the previous
 * edit's cascade left it". Forward order would measure every update but the first
 * against an already-rescheduled task.
 *
 * Which records the batch touches is decided before the order is: the band is cut to `ops`
 * first, so a smaller batch is the same records a larger one starts with.
 */
export function bulkBatch(fixtures, ops = BULK_EDIT_OPS) {
  const { updateIds, deleteIds, insertParentIds } = requireFixtures(fixtures);
  return {
    updateIds: updateIds.slice(0, ops).reverse(),
    deleteIds: deleteIds.slice(0, ops),
    insertParentIds: insertParentIds.slice(0, ops),
  };
}

/**
 * What a shape holds at a given size — the published composition table.
 *
 * Counted from the generator rather than written down, so a reader can check that the two
 * shapes really are the same size.
 */
export function datasetComposition(shape, count) {
  const { nodes, links } = buildDataset({ shape, count });
  const leaves = nodes.filter((node) => node.isLeaf).length;
  return {
    shape,
    size: count,
    summaries: nodes.length - leaves,
    leaves,
    links: links.length,
  };
}
