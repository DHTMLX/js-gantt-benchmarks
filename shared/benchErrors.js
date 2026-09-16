// In-page errors are attributed to the active benchmark step. This catches render/framework
// errors that do not reject page.evaluate; pageerror/crash remain Playwright fallbacks for
// failures before setup or a tab that goes down. The in-page marker and read avoid the race
// of pairing a delayed pageerror with a step. console.error is excluded because libraries use
// it for warnings. Importing this module installs listeners before chart creation.

const collected = [];

// Null between steps means the error is a note, not a failed measurement.
let activeStep = null;

const describe = (error) => {
  if (error instanceof Error) {
    return error.message || String(error);
  }
  return String(error?.message ?? error);
};

// Preserve how the error reached the collector for run diagnostics.
function report(source, error, extra = {}) {
  collected.push({
    step: activeStep,
    source,
    message: describe(error).split("\n")[0].slice(0, 200),
    ...extra,
  });
}

if (typeof window !== "undefined") {
  // Cover synchronous errors and unhandled async rejections.
  window.addEventListener("error", (event) => report("error", event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) =>
    report("unhandledrejection", event.reason)
  );
}

export const benchErrors = {
  /** Attributes reports until `end` to `step`. */
  begin(step) {
    activeStep = step;
  },

  /** Cross a macrotask, frame, and macrotask before reading collected errors. */
  async flush() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise((resolve) => setTimeout(resolve, 0));
  },

  /** Returns errors for `step` and ends its attribution. */
  end(step) {
    activeStep = null;
    return collected.filter((entry) => entry.step === step);
  },

  /** Returns errors reported outside a step. */
  unattributed() {
    return collected.filter((entry) => entry.step == null);
  },

  /** Records an error caught and reported by page/framework code. */
  report(error, extra) {
    report("reported", error, extra);
  },
};

if (typeof window !== "undefined") {
  window.__benchErrors = benchErrors;
}
