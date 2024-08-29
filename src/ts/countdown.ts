import { Renderer } from "./render";
import { hexToRGB } from "./util";

export class Countdown {
  ctx: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  interval: number;
  intervalLength: number;
  intervalCount: number;
  count: number;
  flashColor: string;
  flashOpacity: number;

  constructor(renderer: Renderer) {
    this.ctx = renderer.ctx;
    this.canvas = renderer.canvas;
    this.interval = 0;
    this.intervalLength = 650;
    this.intervalCount = 3;
    this.count = 0;
    this.flashColor = "#ff4d4d";
    this.flashOpacity = 1;

    this.canvas.addEventListener("tick", () => {
      this.draw();
    });
  }

  startTimer(winner?: number) {
    this.count = this.intervalCount;
    this.flashOpacity = 1;

    this.flashColor =
      winner === 0
        ? "#368dc8"
        : winner === 1
        ? "#d3b447"
        : "#ff4d4d";

    this.interval = window.setInterval(() => {
      if (this.count > 1) {
        this.count--;
      } else {
        this.stopTimer();
      }
    }, this.intervalLength);
  }

  stopTimer() {
    window.clearInterval(this.interval);
    this.interval = 0;
    this.canvas.dispatchEvent(new Event("play"));
  }

  draw() {
    if (this.count <= 0 || this.interval === 0) {
      return;
    }

    /*
    this.ctx.save();
    const flashRgb = hexToRGB(this.flashColor);
    this.ctx.fillStyle = `rgba(${flashRgb.r},${flashRgb.g},${flashRgb.b},${this.flashOpacity})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "#ff4d4d";
    this.ctx.shadowColor = "rgba(0,0,0,0.3)";
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;
    this.ctx.shadowBlur = 5;
    this.ctx.font = `${this.canvas.height / 1.5}px PressStart2P`;

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(
      this.count.toString(),
      this.canvas.width / 2,
      this.canvas.height / 2 + 100
    );
    this.ctx.restore();
    */

    this.flashOpacity = Math.max(this.flashOpacity - 0.01, 0);
  }
}
