import { TickEvent } from "./types";

const DT_MAX = 0.1;

export class Renderer {
  ctx: CanvasRenderingContext2D;
  oldTimeStamp: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;

    this.initTicker();
  }

  private initTicker() {
    window.requestAnimationFrame(() => {
      this.tick();
      this.initTicker();
    });
  }

  private tick() {
    const timeStamp = performance.now();
    const dt = Math.min(DT_MAX, (timeStamp - this.oldTimeStamp) / 1000);
    this.oldTimeStamp = timeStamp;

    const tick: TickEvent = new CustomEvent("tick", {
      bubbles: true,
      cancelable: true,
      composed: false,
      detail: { dt },
    });
    const { width, height } = this.ctx.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.canvas.dispatchEvent(tick);
  }
}
