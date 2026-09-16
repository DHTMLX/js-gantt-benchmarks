// Reports live-store coherence; published rounds use their frozen snapshots.

import { pathToFileURL } from "node:url";

import { LIBS, SIZES, MODES, SHAPES, HARNESS_VERSION } from "./config.mjs";
import { listMachines, readStore } from "./results.mjs";
import { resolveVersion } from "./versions.mjs";
import { findRow } from "./tables.mjs";

// Warn when a machine's measurements span too long a period.
const SPAN_WARN_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

const distinct = (values) =>
  [...new Set(values.filter((v) => v !== "" && v != null))].sort();

function inspectMachine(machineId, { libs, installed }) {
  const { metricRows } = readStore(machineId);
  const accounted = new Set(libs.map((lib) => lib.id));

  const libraries = libs.map((lib) => {
    const rows = metricRows.filter((row) => row.lib === lib.id);
    return {
      id: lib.id,
      cells: rows.length,
      measured: distinct(rows.map((row) => row.version)),
      installed: installed?.[lib.id] ?? null,
    };
  });

  const missing = [];
  for (const lib of libs) {
    for (const shape of SHAPES) {
      for (const size of SIZES) {
        for (const mode of MODES) {
          if (!findRow(metricRows, lib.id, shape.id, size, mode)) {
            missing.push(`${lib.id}/${shape.id}/${size}/${mode ? "on" : "off"}`);
          }
        }
      }
    }
  }

  const stamps = metricRows.map((row) => row.measured_at).filter(Boolean).sort();
  const shapeIds = new Set(SHAPES.map((shape) => shape.id));

// Count only accounted apps; out-of-round rows are marked unselected.
  const unselected = distinct(metricRows.map((row) => row.lib).filter((id) => !accounted.has(id)));

  return {
    id: machineId,
    cells: metricRows.filter((row) => accounted.has(row.lib)).length,
    libraries,
    missing,
    unselected,
    harness: {
      measured: distinct(metricRows.map((row) => row.harness)),
      unknown: metricRows.filter((row) => !row.harness).length,
    },
    shapes: {
      measured: distinct(metricRows.map((row) => row.shape)),
      unrecognised: metricRows.filter((row) => !shapeIds.has(row.shape)).length,
    },
    sessions: distinct(metricRows.map((row) => row.session)).length,
    span: stamps.length ? { from: stamps[0], to: stamps.at(-1) } : null,
  };
}

// Report the provenance fields that affect result meaning.
function notesFor(machines, { driftFor }) {
  const notes = [];
  const add = (machine, text) => notes.push({ machine, text });

  for (const machine of machines) {
    const { measured, unknown } = machine.harness;

    if (measured.length > 1) {
      add(machine.id, `rows were produced by harness ${measured.join(" and ")}`);
    }
    for (const version of measured) {
      if (version !== HARNESS_VERSION) {
        add(machine.id, `measured with harness ${version}, now ${HARNESS_VERSION}`);
      }
    }
    if (unknown) {
      add(machine.id, `${unknown} row(s) carry no harness version`);
    }

    if (machine.unselected.length) {
      add(
        machine.id,
        `the store holds rows for ${machine.unselected.join(", ")}, which round-apps.json ` +
          "does not select — nothing generated from this store reads them"
      );
    }

    if (machine.shapes.unrecognised) {
      add(
        machine.id,
        `${machine.shapes.unrecognised} row(s) name no configured dataset shape ` +
          `(${SHAPES.map((shape) => shape.id).join(", ")}), so no table can render them`
      );
    }

    for (const lib of machine.libraries) {
      if (lib.measured.length > 1) {
        add(machine.id, `${lib.id} was measured at ${lib.measured.join(" and ")}`);
      }
      // Compare installed versions only for libraries this run will write.
      const checkDrift =
        driftFor?.includes(lib.id) && lib.installed && lib.installed !== "unknown";
      if (checkDrift && lib.measured.length === 1 && lib.measured[0] !== lib.installed) {
        add(
          machine.id,
          `${lib.id} ${lib.installed} is installed, the store holds ${lib.measured[0]}`
        );
      }
    }

    if (machine.span) {
      const days = (Date.parse(machine.span.to) - Date.parse(machine.span.from)) / DAY_MS;
      if (Number.isFinite(days) && days > SPAN_WARN_DAYS) {
        add(
          machine.id,
          `measurements span ${Math.round(days)} days ` +
            `(${machine.span.from.slice(0, 10)} to ${machine.span.to.slice(0, 10)})`
        );
      }
    }
  }

  return notes;
}

/**
 * @param machineIds which machine directories to inspect; every one in the store by default.
 * @param libs       which libraries to account for, which is also what the missing-cell count
 *                   is relative to.
 * @param driftFor   library ids whose *installed* version should be compared against the store.
 *                   Null skips it, which is right at report time: what is installed on the
 *                   machine generating documents says nothing about what measured the rows.
 */
export function inspectStore({ machineIds, libs = LIBS, driftFor = null } = {}) {
  const ids = machineIds ?? listMachines();
  const installed = driftFor
    ? Object.fromEntries(libs.map((lib) => [lib.id, resolveVersion(lib)]))
    : null;

  const machines = ids.map((id) => inspectMachine(id, { libs, installed }));

  return {
    harnessVersion: HARNESS_VERSION,
    machines,
    notes: notesFor(machines, { driftFor }),
  };
}

export function renderInspection({ harnessVersion, machines, notes }) {
  if (!machines.length) {
    return `Store is empty — nothing measured yet. Harness ${harnessVersion}.`;
  }

  const lines = [`Harness ${harnessVersion}`, ""];

  for (const machine of machines) {
    const cellsTotal = machine.cells + machine.missing.length;
    lines.push(
      `${machine.id} — ${machine.cells}/${cellsTotal} cells, ` +
        `${machine.sessions} session(s)` +
        (machine.span ? `, ${machine.span.from.slice(0, 10)} to ${machine.span.to.slice(0, 10)}` : "")
    );

    const harnessLabel = machine.harness.measured.join(", ") || "not recorded";
    lines.push(
      `  harness   ${harnessLabel}` +
        (machine.harness.unknown ? ` (+${machine.harness.unknown} row(s) unrecorded)` : "")
    );
    lines.push(
      `  shapes    ${machine.shapes.measured.join(", ") || "not recorded"}` +
        (machine.shapes.unrecognised
          ? ` (+${machine.shapes.unrecognised} row(s) not from a configured shape)`
          : "")
    );

    for (const lib of machine.libraries) {
      const measured = lib.measured.join(", ") || "—";
      const installed =
        lib.installed && lib.installed !== measured ? `  installed ${lib.installed}` : "";
      lines.push(`  ${lib.id.padEnd(11)} ${measured}${installed}`);
    }

    if (machine.missing.length) {
      const shown = machine.missing.slice(0, 6).join(", ");
      lines.push(
        `  missing   ${machine.missing.length} cell(s): ${shown}` +
          (machine.missing.length > 6 ? ", …" : "")
      );
    }
    lines.push("");
  }

  for (const note of notes) {
    lines.push(`note      ${note.machine}: ${note.text}`);
  }
  if (!notes.length) {
    lines.push("One harness version, one release per library.");
  }

  return lines.join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(renderInspection(inspectStore({ driftFor: LIBS.map((lib) => lib.id) })));
}
