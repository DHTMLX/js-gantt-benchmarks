// Resolves the measured library versions from installed packages or explicit vendored labels.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function resolveVersion(lib) {
  if (lib.version) {
    return lib.version;
  }

  try {
    return JSON.parse(
      readFileSync(join(ROOT, lib.dir, "node_modules", lib.package, "package.json"), "utf8")
    ).version;
  } catch {
    // Missing dependencies remain visible as unknown before a long run.
    return "unknown";
  }
}

export function resolveVersions(libs) {
  return Object.fromEntries(libs.map((lib) => [lib.id, resolveVersion(lib)]));
}
