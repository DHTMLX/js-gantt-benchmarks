// Shared CLI parsing; machine and round values become validated path segments.

import { assertMachineId } from "./machine.mjs";

/** `--machine <id>`, falling back to the reference machine (or null, for prune). */
export function machineIdFromArgv(argv, fallback) {
  const index = argv.indexOf("--machine");
  if (index === -1) {
    return fallback;
  }
  return assertMachineId(argv[index + 1]);
}

/** `--round <version>`, falling back to ROUND_VERSION. */
export function roundVersionFromArgv(argv, fallback) {
  const index = argv.indexOf("--round");
  if (index === -1) {
    return fallback;
  }
  const value = argv[index + 1];
  if (!/^[0-9]+\.[0-9]+\.[0-9]+([-.][A-Za-z0-9.-]+)?$/.test(value ?? "")) {
    throw new Error(
      `--round must look like a version — 1.2.3, optionally with a suffix — got "${value}"`
    );
  }
  return value;
}

/** Presence of a bare flag, e.g. `--yes`. */
export const hasFlag = (argv, name) => argv.includes(name);
