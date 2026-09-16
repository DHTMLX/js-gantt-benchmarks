// Layout settings shared by every app; adapters import these values rather than duplicating
// benchmark dimensions.

// The row height is part of the scrolling workload and must stay aligned with Kendo's minimum.
export const ROW_HEIGHT = 36;

// Grid width shared by every app, leaving the same timeline width in the benchmark viewport.
export const GRID_WIDTH = 380;

// Bottom timeline tier used for the common three-month window.
export const TIMELINE_BOTTOM_UNIT = "day";
