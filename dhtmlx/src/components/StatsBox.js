export class StatsBox {
  constructor() {
    this.element = document.createElement("div");
    this.element.id = "stats-box";

    this.data = {
      fpsCurrent: 0,
      fpsAverage: 0,
      fpsMin: 0,
      memoryUsed: 0,
      time: 0,
      label: "",
    };
    this.render();
  }

  setStats(stats) {
    this.data = {
      ...this.data,
      fpsCurrent: stats.current,
      fpsAverage: stats.average,
      fpsMin: stats.min,
      memoryUsed: stats.memory.used,
      time: stats.time || this.data.time,
      label: stats.label || this.data.label,
    };
    this.render();
  }

  setData(partial) {
    this.data = { ...this.data, ...partial };
    this.render();
  }

  render() {
    const d = this.data;
    this.element.innerHTML = `
      <div><strong>FPS</strong>: <br/>
        current: ${d.fpsCurrent} <br/>
        average: ${d.fpsAverage} <br/>
        min: ${d.fpsMin} <br/>
      </div>
      <div><strong>Memory</strong>: ${d.memoryUsed} Mb</div>
      <div><strong>Time to render</strong>: ${Math.round(d.time)} ms</div>
      ${d.label ? `<div><strong>Status</strong>: ${d.label}</div>` : ""}
    `;
  }
}