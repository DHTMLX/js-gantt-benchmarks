// Removes live evidence only after verifying an identical frozen round snapshot.

import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { ROUND_VERSION } from "./config.mjs";
import { hasFlag, machineIdFromArgv, roundVersionFromArgv } from "./argv.mjs";
import { EVIDENCE_FILES, listMachines, machineDir } from "./results.mjs";
import { roundEvidenceDir } from "./paths.mjs";

const snapshotDir = (version, machineId) =>
  join(roundEvidenceDir(version), machineId);

/** Everything in this machine's store directory that the round does not already hold. */
function unpreserved(machineId, version) {
  const from = machineDir(machineId);
  const to = snapshotDir(version, machineId);

  if (!existsSync(from)) {
    return [`not in the store — nothing at ${from}`];
  }
  if (!existsSync(to)) {
    return [`round ${version} has no snapshot of this machine`];
  }

  const problems = [];
  for (const file of EVIDENCE_FILES) {
    const live = join(from, file);
    // A file the store does not have cannot be lost by deleting the directory.
    if (!existsSync(live)) continue;

    const frozen = join(to, file);
    if (!existsSync(frozen)) {
      problems.push(`${file} is not in the round's snapshot`);
    } else if (!readFileSync(live).equals(readFileSync(frozen))) {
      problems.push(`${file} differs from the round's snapshot — it holds newer measurements`);
    }
  }
  return problems;
}

export function prune({ version = ROUND_VERSION, machineIds, apply = false } = {}) {
  const machines = machineIds ?? listMachines();
  if (!machines.length) {
    return { version, machines: [], blocked: [], removed: [] };
  }

  const checked = machines.map((id) => ({ id, problems: unpreserved(id, version) }));
  const blocked = checked.filter((c) => c.problems.length);
  if (blocked.length) {
    return { version, machines, blocked, removed: [] };
  }

  const removed = [];
  if (apply) {
    for (const { id } of checked) {
      rmSync(machineDir(id), { recursive: true, force: true });
      removed.push(id);
    }
  }
  return { version, machines, blocked, removed };
}

// CLI entry
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const version = roundVersionFromArgv(argv, ROUND_VERSION);
  const only = machineIdFromArgv(argv, null);
  const apply = hasFlag(argv, "--yes");

  const result = prune({
    version,
    machineIds: only ? [only] : undefined,
    apply,
  });

  if (!result.machines.length) {
    console.log("raw-results/ is already empty — nothing to prune.");
  } else if (result.blocked.length) {
    console.error(
      `Refusing to prune: round ${version} does not hold everything in the store.\n`
    );
    for (const { id, problems } of result.blocked) {
      console.error(`  ${id}`);
      for (const problem of problems) console.error(`    - ${problem}`);
    }
    console.error(
      `\nRun \`npm run report\` to snapshot the current store into reports/${version}/, ` +
        "then prune.\nIf those measurements are meant to be discarded rather than published, " +
        "delete the\ndirectory by hand — this command only removes what is already preserved."
    );
    // The likeliest cause of "no snapshot of this machine" is having bumped already: prune
    // checks reports/<ROUND_VERSION>/, which for a round that has not been generated yet is
    // empty. Prune before bumping, or name the round that actually holds the data.
    if (result.blocked.some(({ problems }) => problems.some((p) => p.includes("no snapshot")))) {
      console.error(
        `\nIf you have already bumped ROUND_VERSION, pass the round that holds this data:\n` +
          "  npm run prune -- --round <previous> --yes"
      );
    }
    process.exitCode = 1;
  } else if (apply) {
    console.log(
      `Pruned ${result.removed.length} machine(s) from raw-results/: ${result.removed.join(", ")}\n` +
        `  preserved in reports/${version}/raw-results/`
    );
  } else {
    // Spelled as a whole command, and echoing back the flags that were just used, because
    // the `--` is not decoration: npm keeps a `--yes` of its own, so `npm run prune --yes`
    // is swallowed by npm, never reaches this script, and prints this same message again.
    // Advice of the form "re-run with --yes" is what sends someone into that loop.
    const withYes = ["npm run prune --", ...argv, "--yes"].join(" ");
    console.log(
      `Would remove ${result.machines.length} machine(s) from raw-results/: ` +
        `${result.machines.join(", ")}\n` +
        `  every evidence file is already in reports/${version}/raw-results/ with identical bytes\n\n` +
        `Re-run to remove them:\n  ${withYes}`
    );
  }
}
