import { getMousePos } from "../gui";
import { C, PX } from "../main";
import { Player } from "../player";
import { Vec2, vec3, Vec3 } from "../types";

export class BoostHud {
  private ctx: CanvasRenderingContext2D
  private player: Player;

  constructor(ctx: CanvasRenderingContext2D, player: Player) {
    this.player = player;
    this.ctx = ctx;

    ctx.canvas.addEventListener("mousedown", (event: MouseEvent) => {
      const mousePos = getMousePos(event.clientX, event.clientY, this.ctx, "world");
      if (mousePos.mag() < player.scale.x) {
        this.player.action.plannedBoost = mousePos;
      }
    });

    ctx.canvas.addEventListener("mousemove", (event: MouseEvent) => {
      if (this.player.action.plannedBoost === null) return;

      const mousePos = getMousePos(event.clientX, event.clientY, this.ctx, "world");
      this.player.action.plannedBoost = mousePos;
    });

    ctx.canvas.addEventListener("mouseup", (event: MouseEvent) => {
      if (this.player.action.plannedBoost === null) return;
      this.player.velocity = this.screenToBoost(this.player.action.plannedBoost)
        .boost(this.player.velocity);
      this.player.action.plannedBoost = null;
    });

    ctx.canvas.addEventListener("tick", () => this.draw());
  }

  private screenToBoost(screen: Vec2): Vec3 {
    // 4 orders of magnitude from 0.001 (0.1¢) to 10.0 (1000¢) over 1000PX
    const screenMag = screen.mag();
    if (screenMag === 0) return vec3(1, 0, 0);
    const boostMag = 0.001 * Math.pow(1e4, screenMag / (1000 * PX));
    return screen.times(boostMag / screenMag).spaceToVel3();
  }

  draw() {
    if (this.player.action.plannedBoost !== null) {
      const { x, y } = this.player.action.plannedBoost;

      this.ctx.save();

      const { width, height } = this.ctx.canvas;
      this.ctx.translate(width / 2, height / 2);
      this.ctx.scale(C, -C);

      this.ctx.strokeStyle = "green";
      this.ctx.lineWidth = 2 * PX;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();

      this.ctx.restore();
    }
  }
}