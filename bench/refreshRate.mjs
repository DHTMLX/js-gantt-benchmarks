// Measures the machine's requestAnimationFrame ceiling for FPS validation and reporting.

const WARMUP_FRAMES = 5;
const SAMPLE_FRAMES = 40;

export async function measureRefreshHz(browser) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto("about:blank");
    return await page.evaluate(
      ({ warmup, samples }) =>
        new Promise((resolve) => {
          const stamps = [];
          const total = warmup + samples;
          const tick = (now) => {
            stamps.push(now);
            if (stamps.length <= total) {
              requestAnimationFrame(tick);
              return;
            }
            // Median rather than mean: one long frame from a background task would
            // otherwise drag the estimate down.
            const deltas = stamps
              .slice(warmup + 1)
              .map((t, i) => t - stamps[warmup + i])
              .sort((a, b) => a - b);
            const middle = deltas[Math.floor(deltas.length / 2)];
            resolve(middle > 0 ? Math.round(1000 / middle) : null);
          };
          requestAnimationFrame(tick);
        }),
      { warmup: WARMUP_FRAMES, samples: SAMPLE_FRAMES }
    );
  } finally {
    await context.close();
  }
}
