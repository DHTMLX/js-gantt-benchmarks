// Interactive controls for the shared benchmark contract. STEPS mirrors the runner's
// measured order; controls add no timing or thresholds of their own.

import { DATASET_YEARS, SIZES } from "./benchConfig.js";
import { BULK_EDIT_OPS, DEFAULT_SHAPE, SHAPE_IDS } from "./dataset.js";

const spaced = (n) => n.toLocaleString("en-US").replace(/,/g, " ");

const sizeLabel = (n) => (n >= 1000 ? `${n / 1000}k` : String(n));

const msLabel = (v) => (typeof v === "number" ? `${Math.round(v)} ms` : "n/a");

const notSettled = (result) =>
  `did not settle — ${result.frames} frames, ${result.busyFrames} over threshold, ` +
  `worst ${result.maxFrameMs} ms`;

const timeOf = (result) =>
  result && typeof result === "object" && "settled" in result
    ? result.settled
      ? result.ms
      : 0
    : null;

const STEPS = [
  {
    id: "memory",
    label: "Memory",
    run: (bench) => bench.memory(),
    report: (mb) =>
      mb == null
        ? "memory — unavailable (Chromium needs --enable-precise-memory-info)"
        : `memory — ${mb} MB, no forced GC (the runner collects first, so it reads lower)`,
  },
  {
    id: "scroll",
    label: "Test scroll",
    run: (bench) => bench.scroll(),
    report: (result) =>
      result.scrolled
        ? `scroll — ${result.average} fps average, ${result.min} fps worst second, ` +
          `${spaced(Math.round(result.distance))} px in ${result.frames} frames`
        : "scroll — moved nothing (no scrollable pane, or already at the bottom)",
  },
  {
    id: "move",
    label: "Move task",
    // Match the runner's top-of-chart move precondition.
    run: async (bench) => {
      await bench.scrollTop();
      return bench.move();
    },
    report: (result) =>
      result.settled
        ? `move — ${msLabel(result.ms)} (from the top of the chart)`
        : `move — ${notSettled(result)}`,
  },
  {
    id: "bulk edit",
    label: `Bulk edit ${BULK_EDIT_OPS}`,
    run: (bench) => bench.bulkEdit(BULK_EDIT_OPS),
    report: (result) =>
      result.settled
        ? `bulk edit — ${msLabel(result.ms)} for ${BULK_EDIT_OPS} updates, ` +
          `${BULK_EDIT_OPS} deletions and ${BULK_EDIT_OPS} insertions`
        : `bulk edit — ${notSettled(result)}`,
  },
];

export class Toolbar {
  /** @param bench shared benchmark contract; @param onStatus status callback. */
  constructor({ bench, onStatus } = {}) {
    if (!bench) {
      throw new Error("Toolbar needs the bench object installBench() returned");
    }

    this.bench = bench;
    this.onStatus = onStatus || (() => {});

    this.element = document.createElement("div");
    this.element.id = "header";

    this.shape = DEFAULT_SHAPE;
    this.autoScheduling = false;
    this.busy = false;
    // Prevent input from overlapping a measured operation.
    this.controls = [];

    this.createControls();
  }

  setStatus(label, time) {
    this.onStatus(time == null ? { label } : { label, time });
  }

  /** Runs one operation while controls are locked and reports `{ ok, value }`. */
  async guard(label, operation) {
    if (this.busy) {
      return { ok: false, value: null };
    }
    this.busy = true;
    this.controls.forEach((control) => (control.disabled = true));
    this.setStatus(`${label}…`);

    try {
      return { ok: true, value: await operation() };
    } catch (error) {
      this.setStatus(`${label} — error: ${error.message}`);
      console.error(error);
      return { ok: false, value: null };
    } finally {
      this.busy = false;
      this.controls.forEach((control) => (control.disabled = false));
    }
  }

  /** @returns whether the chain may carry on from here — see runCell. */
  async load(count) {
    const mode = this.autoScheduling ? "on" : "off";
    const label = `load ${spaced(count)} (${this.shape}, auto-scheduling ${mode})`;

    const { ok, value: result } = await this.guard(label, () =>
      this.bench.load(count, DATASET_YEARS, this.shape)
    );
    if (!ok) {
      return false;
    }
    console.log(label, result);

    const ttfp =
      result.ttfp == null
        ? "ttfp n/a — only measured from an empty chart, so reload the page first"
        : `ttfp ${msLabel(result.ttfp)}`;

    this.setStatus(
      result.settled
        ? `${label} — ttr ${msLabel(result.ms)}, ${ttfp}`
        : `${label} — ${notSettled(result)}`,
      timeOf(result)
    );
    return result.settled;
  }

  /** @returns whether the chain may carry on from here — see runCell. */
  async step(definition) {
    const { ok, value: result } = await this.guard(definition.id, () =>
      definition.run(this.bench)
    );
    if (!ok) {
      return false;
    }
    console.log(definition.id, result);
    this.setStatus(definition.report(result), timeOf(result));
    return result?.settled !== false;
  }

  // Apply mode before load, then run the measured chain on the current chart.
  async runCell(count) {
    await this.applyAutoScheduling();
    if (!(await this.load(count))) {
      return;
    }
    for (const definition of STEPS) {
      if (!(await this.step(definition))) {
        return;
      }
    }
  }

  applyAutoScheduling() {
    const mode = this.autoScheduling ? "on" : "off";
    return this.guard(`auto-scheduling ${mode}`, () =>
      this.bench.setAutoScheduling(this.autoScheduling)
    );
  }

  async setAutoScheduling(enabled) {
    this.autoScheduling = enabled;
    const { ok } = await this.applyAutoScheduling();
    if (ok) {
      this.setStatus(`auto-scheduling ${enabled ? "enabled" : "disabled"}`);
    }
  }

  button(label, onClick) {
    const button = document.createElement("button");
    button.textContent = label;
    button.onclick = onClick;
    this.controls.push(button);
    this.element.appendChild(button);
    return button;
  }

  select(id, options, onChange) {
    const select = document.createElement("select");
    select.id = id;
    options.forEach(({ value, text, disabled }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      option.disabled = Boolean(disabled);
      select.appendChild(option);
    });
    select.onchange = (event) => onChange(event.target.value, select);
    this.controls.push(select);
    this.element.appendChild(select);
    return select;
  }

  createControls() {
    const shapeSelect = this.select(
      "shape-select",
      SHAPE_IDS.map((shape) => ({ value: shape, text: shape })),
      (value) => {
        this.shape = value;
      }
    );
    shapeSelect.value = this.shape;

    SIZES.forEach((count) => {
      this.button(`Load ${sizeLabel(count)}`, () => this.load(count));
    });

    if (this.bench.supportsAutoScheduling) {
      this.element.appendChild(this.autoSchedulingControl());
    }

    const spacer = document.createElement("div");
    spacer.className = "spacer";
    this.element.appendChild(spacer);

    STEPS.forEach((definition) => {
      this.button(definition.label, () => this.step(definition));
    });

    const runCell = this.select(
      "run-cell-select",
      [
        { value: "", text: "Run cell…", disabled: true },
        ...SIZES.map((count) => ({
          value: String(count),
          text: `Run cell ${sizeLabel(count)}`,
        })),
      ],
      async (value, select) => {
        select.value = "";
        await this.runCell(Number(value));
      }
    );
    runCell.value = "";
  }

  autoSchedulingControl() {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.gap = "5px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "auto-scheduling-checkbox";
    checkbox.checked = this.autoScheduling;
    checkbox.onchange = (event) => this.setAutoScheduling(event.target.checked);
    this.controls.push(checkbox);

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = "Auto-scheduling";

    container.appendChild(checkbox);
    container.appendChild(label);
    return container;
  }
}
