import { Entity } from "../entity";
import { getMousePos } from "../gui";
import { C, PX } from "../main";
import { Player } from "../player";
import { vec2, Vec2, vec3, Vec3 } from "../types";

const ARROW_RADIUS = 10;

export class BoostHud {
  private ctx: CanvasRenderingContext2D
  private player: Player;
  private entities: Entity[];

  constructor(ctx: CanvasRenderingContext2D, player: Player, entities: Entity[]) {
    this.player = player;
    this.ctx = ctx;
    this.entities = entities;

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
    const boostMag = 0.001 * Math.pow(10, screenMag / (250 * PX));
    return screen.times(boostMag / screenMag).spaceToVel3();
  }

  private boostToScreen(boost: Vec3): Vec2 {
    const boostMag = boost.space().mag();
    if (boostMag <= 0.001) return vec2(0, 0);
    const screenMag = Math.log10(boostMag / 0.001) * 250 * PX;
    return boost.space().times(screenMag / boostMag);
  }

  draw() {
    if (this.player.action.plannedBoost !== null) {
      this.ctx.save();

      const { width, height } = this.ctx.canvas;
      this.ctx.translate(width / 2, height / 2);
      this.ctx.scale(C, -C);

      this.ctx.fillStyle = "rgba(0, 127, 255, 0.5)";
      this.ctx.lineWidth = 2 * PX;
      this.drawArrow(vec2(0, 0), this.player.action.plannedBoost);

      this.ctx.fillStyle = "rgba(255, 127, 0, 0.5)";

      const plannedVel = this.screenToBoost(this.player.action.plannedBoost)
        .boost(this.player.velocity);
      this.entities.forEach(e => {;
        const entityVel = this.boostToScreen(e.velocity.boost(plannedVel.inv()));
        this.drawArrow(e.position.space(), e.position.space().plus(entityVel));
      })

      this.ctx.restore();
    }
  }

  drawArrow(start: Vec2, end: Vec2) {
    const radius = ARROW_RADIUS * PX;
    const diff = end.minus(start);
    const lengthSq = diff.magSq();
    if (lengthSq <= radius * radius) {
      // Too short for arrow, just draw a circle
      this.ctx.beginPath();
      this.ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI)
      this.ctx.fill();
      return;
    }

    //   x
    //   |\ L
    //   +-O
    // 90° ha
    //    R
    const direction = Math.atan2(diff.y, diff.x);
    const halfAngle = Math.acos(radius / Math.sqrt(lengthSq));
    this.ctx.beginPath();
    this.ctx.arc(start.x, start.y, radius, direction + halfAngle, direction - halfAngle);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.closePath();
    this.ctx.fill();
  }
}