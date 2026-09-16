// Shared scroll motion for the FPS test. Apps choose the scroller; this module owns the
// distance, frame count, and per-frame positions.
export const SCROLL_STEPS = 100;

/**
 * Advances `scroller` from wherever it is to its bottom in `SCROLL_STEPS` equal steps, one
 * per animation frame, resolving one frame after the last step so the paint that step
 * causes still falls inside the caller's measurement window.
 *
 * Offsets are computed absolutely rather than accumulated, so float error cannot leave the
 * last step short of the bottom. `behavior: "instant"` because a `scroll-behavior: smooth`
 * rule anywhere in a library's stylesheet would otherwise animate every step and have the
 * benchmark measure the browser's easing instead of the library's rendering. `left` is
 * omitted so the horizontal position is left exactly as the library set it.
 *
 * Resolves with what it actually did. A pane that was not found or had nothing to scroll
 * reports zero distance, so "the scroll was a no-op" is visible in the result rather than
 * arriving as an FPS figure that reads like a perfect score.
 */
export function scrollElementToBottom(scroller) {
  return new Promise((resolve) => {
    const from = scroller?.scrollTop ?? 0;
    const distance = scroller
      ? scroller.scrollHeight - scroller.clientHeight - from
      : 0;

    if (distance <= 0) {
      resolve({ scrolled: false, from, to: from, distance: 0, steps: 0 });
      return;
    }

    let step = 0;

    const tick = () => {
      step++;
      scroller.scrollTo({
        top: from + (distance * step) / SCROLL_STEPS,
        behavior: "instant",
      });

      if (step < SCROLL_STEPS) {
        requestAnimationFrame(tick);
        return;
      }

      requestAnimationFrame(() =>
        resolve({
          scrolled: true,
          from,
          to: scroller.scrollTop,
          distance,
          steps: step,
        })
      );
    };

    requestAnimationFrame(tick);
  });
}

/**
 * Of the elements matching `selector` inside `root`, the one with the most left to scroll.
 *
 * Two of the apps cannot name their scrolling pane statically — the candidates all exist
 * and which one carries the vertical scroll depends on the library's own layout decisions
 * — so they pick at runtime. The rule is here rather than duplicated in both of them, but
 * it is not imposed on the three apps that do name one pane directly: for those, changing
 * how the pane is chosen could change *which* pane is measured, which is not a change this
 * module should make on their behalf.
 */
export function tallestScroller(root, selector) {
  if (!root) {
    return null;
  }

  return (
    Array.from(root.querySelectorAll(selector))
      .map((element) => ({
        element,
        maxScrollTop: element.scrollHeight - element.clientHeight,
      }))
      .filter(({ maxScrollTop }) => maxScrollTop > 0)
      .sort((a, b) => b.maxScrollTop - a.maxScrollTop)[0]?.element ?? null
  );
}
