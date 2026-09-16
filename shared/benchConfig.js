// Measurement constants shared by the page, toolbar, and runner.

// A frame longer than this counts as busy.
export const BUSY_FRAME_MS = 32;

// Consecutive cheap frames required for settling.
export const QUIET_FRAMES = 5;

// The cap starts with the operation and matches the runner's timeout. A capped operation
// reports did-not-settle rather than a misleading duration.
export const SETTLE_CAP_MS = 5 * 60 * 1000;

// Dataset sizes measured by the runner and offered by the toolbar.
export const SIZES = [1000, 5000, 10000, 50000, 100000];

// Date density shared by measured and manual loads.
export const DATASET_YEARS = 2;
