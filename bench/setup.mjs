// Installs pinned Chromium and every registered app from its committed lockfile.

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { REGISTERED_LIBS } from "./config.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(command, cwd) {
  return new Promise((resolve, reject) => {
    console.log(`\n$ ${command}   (${cwd === ROOT ? "." : cwd.replace(ROOT + "\\", "").replace(ROOT + "/", "")})`);
    const child = spawn(command, { cwd, shell: true, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`))
    );
  });
}

await run("npx playwright install chromium", ROOT);

for (const lib of REGISTERED_LIBS) {
  await run("npm ci", join(ROOT, lib.dir));
}

console.log("\nSetup complete. Run `npm run bench` to produce the full result set.");
