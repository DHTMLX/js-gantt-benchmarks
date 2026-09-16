// Builds each app and serves its production bundle with vite preview.

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(command, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { cwd, shell: true, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`))
    );
  });
}

export async function buildApps(libs) {
  for (const lib of libs) {
    const cwd = join(ROOT, lib.dir);
    console.log(`\n[build] ${lib.id}`);
    await run("npm run build", cwd);
  }
}

async function waitForPort(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}/`, { method: "GET" });
      if (res.ok || res.status === 404) {
        return;
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`preview server on port ${port} did not come up in ${timeoutMs}ms`);
}

// A leftover `vite preview` from an interrupted run answers on the port, so `--strictPort` makes
// the new server exit while waitForPort succeeds against the old one — and the matrix is then
// measured against whatever that process serves. Checked before spawning, and fatal.
async function assertPortFree(port, libId) {
  try {
    await fetch(`http://localhost:${port}/`, { method: "GET" });
  } catch {
    return;
  }
  throw new Error(
    `port ${port} (${libId}) is already serving something. Stop it before running the ` +
      "benchmark — most likely a vite preview left behind by an interrupted run."
  );
}

const running = [];

export async function startServers(libs) {
  for (const lib of libs) {
    await assertPortFree(lib.port, lib.id);
  }

  for (const lib of libs) {
    const cwd = join(ROOT, lib.dir);
    // `shell: true` means the child is a shell wrapping npx wrapping vite; killing the shell
    // alone leaves the server holding the port. POSIX `detached` puts the whole tree in its
    // own process group, which is what lets `kill(-pid)` in stopServers reach all of it.
    // Windows has no process groups to signal, so it uses `taskkill /t` instead.
    const child = spawn(
      `npx vite preview --port ${lib.port} --strictPort`,
      { cwd, shell: true, stdio: "ignore", detached: process.platform !== "win32" }
    );
    // The servers are stopped explicitly, so their handles must not be what keeps the
    // runner alive if one of them ignores the signal.
    child.unref();
    running.push(child);
    await waitForPort(lib.port);
    console.log(`[serve] ${lib.id} -> http://localhost:${lib.port}/`);
  }
}

export function stopServers() {
  for (const child of running) {
    // Kill the tree, not the shell: on POSIX the negative pid signals the process group the
    // detached spawn above created, and on Windows `/t` takes the children with it.
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], { stdio: "ignore" });
      } else {
        process.kill(-child.pid, "SIGTERM");
      }
    } catch {
      // already gone
    }
  }
  running.length = 0;
}
