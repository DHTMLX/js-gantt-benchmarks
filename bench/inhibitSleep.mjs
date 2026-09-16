// Keeps the machine awake during a run; inhibitors are process-scoped and do not change
// operator session settings.

import { spawn } from "node:child_process";
import os from "node:os";

// Read holding state after startup because a child may exit immediately after a successful exec.
function spawnInhibitor(command, args) {
  const child = spawn(command, args, { stdio: "ignore" });
  let stopped = false;
  let failed = child.pid === undefined; // a failed exec is reported synchronously

  child.on("error", () => { failed = true; });
  // A child killed by stop() held the assertion for as long as it was wanted. One that exits
  // on its own either never held it or stopped mid-run.
  child.on("exit", () => { if (!stopped) failed = true; });

  return {
    stop() {
      stopped = true;
      try {
        child.kill();
      } catch {
        // already gone
      }
    },
    get failed() {
      return failed;
    },
  };
}

export function startSleepInhibitor() {
  const platform = os.platform();

  if (platform === "darwin") {
    // -d display, -i idle, -m disk, -s system. `-w` makes caffeinate exit with this process,
    // so the assertions follow the run even when it dies without reaching cleanup.
    const handle = spawnInhibitor("caffeinate", ["-dims", "-w", String(process.pid)]);
    return {
      // The pid is deliberately not interpolated: this string is published in the environment
      // block, where a value that differs every run is noise.
      mechanism: "caffeinate -dims -w <runner pid>",
      get active() { return !handle.failed; },
      stop: handle.stop,
    };
  }

  if (platform === "linux") {
    // logind inhibitions held by a child process, released by the runner's cleanup on every
    // ordinary exit path. There is no `-w` equivalent, so a SIGKILL leaves this child holding
    // them until it is killed. They cover idle, sleep and the lid switch, not the X11
    // screensaver or DPMS, which are session settings — hence the instructions below.
    const handle = spawnInhibitor("systemd-inhibit", [
      "--what=idle:sleep:handle-lid-switch",
      "--who=gantt-benchmark",
      "--why=js-gantt-performance benchmark run in progress",
      "sleep",
      "infinity",
    ]);
    return {
      mechanism: "systemd-inhibit --what=idle:sleep:handle-lid-switch",
      get active() { return !handle.failed; },
      stop: handle.stop,
      instructions:
        "systemd-inhibit covers idle, sleep and the lid switch. Turn screen blanking and\n" +
        "  locking off yourself for the duration, and back on afterwards:\n" +
        "    xset s off -dpms                                         # X11\n" +
        "    gsettings set org.gnome.desktop.session idle-delay 0     # GNOME, also Wayland\n" +
        "    gsettings set org.gnome.desktop.screensaver lock-enabled false\n" +
        "  A blanked or locked screen throttles requestAnimationFrame to about 1 fps.",
    };
  }

  return {
    mechanism: "none — set manually on Windows",
    active: false,
    stop() {},
    instructions:
      "Windows has no way to inhibit sleep and screen blanking from an unelevated\n" +
      "  process. Before a long run, disable both for the duration:\n" +
      "    powercfg /change monitor-timeout-ac 0\n" +
      "    powercfg /change standby-timeout-ac 0\n" +
      "  and turn off the lock screen timeout. A blanked screen throttles\n" +
      "  requestAnimationFrame to about 1 fps, which caps every timed step.",
  };
}
