// Drives the on-screen stats box during manual runs. Published FPS comes from the shim's
// exact scroll-window meter.
export class FPSCounter {
  constructor({ callback = null, historyDuration = 30 } = {}) {
    this.callback = callback;
    this.historyDuration = historyDuration;

    this.currentFPS = 0;
    this.fpsHistory = [];
    this.frameCount = 0;
    this.lastSecondTime = 0;
    this.running = false;
    this.rafId = null;
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.frameCount = 0;
    this.lastSecondTime = performance.now();
    this.fpsHistory = [];

    this.tick = this.tick.bind(this);
    this.rafId = requestAnimationFrame(this.tick);
  }

  reset() {
    this.fpsHistory = [];
    this.currentFPS = 60;
  }

  stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  tick(timestamp) {
    if (!this.running) {
      return;
    }

    this.frameCount++;

    const elapsed = timestamp - this.lastSecondTime;
    if (elapsed >= 1000) {
      this.currentFPS = Math.round((this.frameCount * 1000) / elapsed);
      this.fpsHistory.push(this.currentFPS);

      if (this.fpsHistory.length > this.historyDuration) {
        this.fpsHistory.shift();
      }

      if (this.callback) {
        this.callback(this.getStats());
      }

      this.frameCount = 0;
      this.lastSecondTime = timestamp;
    }

    this.rafId = requestAnimationFrame(this.tick);
  }

  getStats() {
    const stats = {
      current: this.currentFPS,
      min: this.fpsHistory.length ? Math.min(...this.fpsHistory) : 0,
      average: this.fpsHistory.length
        ? Math.round(
            this.fpsHistory.reduce((sum, value) => sum + value, 0) /
              this.fpsHistory.length
          )
        : 0,
      memory: {
        used: 0,
        total: 0,
        limit: 0,
      },
    };

    if (performance.memory) {
      stats.memory = {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
      };
    }

    return stats;
  }
}
