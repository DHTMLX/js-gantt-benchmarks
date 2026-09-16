// Machine identity: the directory name a machine's results are keyed by, and the name it is
// published under.

import os from "node:os";

/**
 * What each measuring machine is called in published output.
 *
 * The id is derived from the CPU and the platform, which is what a directory can be named and
 * not what a reader recognises. A machine with no entry here publishes its id alone — the right
 * default for someone else's run of this benchmark, and for a machine nobody has named yet.
 */
export const MACHINE_NAMES = {
  "Apple-M1-mac": "MacBook Air M1",
};

/** A machine's published name, or null for one that has not been named. */
export const machineName = (id) => MACHINE_NAMES[id] ?? null;

/** How a machine is introduced in prose: its name, and the id its evidence is filed under. */
export const machineTitle = (id) =>
  machineName(id) ? `${machineName(id)} (\`${id}\`)` : `\`${id}\``;

const PLATFORM_NAMES = { win32: "win", darwin: "mac", linux: "linux" };

const slug = (text) =>
  text
    .replace(/\(R\)|\(TM\)|\(tm\)/g, "")
    .replace(/@.*$/, "")
    .replace(/\swith\s.*$/i, "")
    .replace(/\b(Processor|CPU)\b/gi, "")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Prefer a CPU model token; otherwise use the complete sanitized slug.
function cpuToken(model) {
  const full = slug(model);
  const parts = full.split("-");
  for (let i = parts.length - 1; i >= 1; i--) {
    if (/\d/.test(parts[i]) && /[A-Za-z]/.test(parts[i - 1] + parts[i])) {
      return `${parts[i - 1]}-${parts[i]}`;
    }
  }
  return full;
}

export function detectMachineId() {
  const platform = PLATFORM_NAMES[os.platform()] ?? os.platform();
  const model = os.cpus()[0]?.model?.trim();
  return `${model ? cpuToken(model) : "unknown-cpu"}-${platform}`;
}

export function assertMachineId(id) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id ?? "")) {
    throw new Error(
      `--machine must be a plain directory name (letters, digits, dot, dash, underscore), got "${id}"`
    );
  }
  return id;
}
