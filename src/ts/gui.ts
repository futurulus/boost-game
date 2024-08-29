import config from "../../config.json" assert { type: "json" };
import { Game } from "./main";
import { Player } from "./player";
import { Renderer } from "./render";
import { Vec2, vec2 } from "./types";
import { CircleButton } from "./ui/button";
import { BoostHud } from "./ui/hud";

const BUTTON = {
  scale: 40,
  radius: 0.75,
  lineWidth: 4,
}

export const getMousePos = (
  x: number, y: number, canvas: HTMLCanvasElement, mode: "canvas" | "world" = "canvas"
): Vec2 => {
  // https://stackoverflow.com/a/17130415
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasPos = vec2((x - rect.left) * scaleX, (y - rect.top) * scaleY);
  if (mode === "canvas") return canvasPos;

  const { width, height } = canvas;
  const invPos = canvasPos.minus(vec2(width * 0.5, height * 0.5));
  return vec2(invPos.x, -invPos.y);
}

export class Gui {
  private ctx: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private player: Player;
  private score: number[];
  private visualButton: CircleButton;
  private nowButton: CircleButton;
  private futureButton: CircleButton;
  private boostHud: BoostHud;

  constructor(game: Game, players: number) {
    const { player, entities } = game;
    const { ctx, canvas } = game.renderer;
    this.ctx = ctx;
    this.canvas = canvas;
    this.player = game.player;
    this.score = [];
    this.score.length = players;
    this.score.fill(0);

    this.visualButton = new CircleButton({
      renderer: game.renderer,
      position: vec2(75, 75),
      scale: vec2(BUTTON.scale, BUTTON.scale),
      color: 'white',
      draw: (ctx) => this.drawVisualButton(ctx),
      isSelected: () => this.player.cameraMode === "visual",
      onclick: () => { this.player.cameraMode = "visual"; },
    });
    this.nowButton = new CircleButton({
      renderer: game.renderer,
      position: vec2(175, 75),
      scale: vec2(BUTTON.scale, BUTTON.scale),
      color: 'red',
      draw: (ctx) => this.drawNowButton(ctx),
      isSelected: () => this.player.cameraMode === "now",
      onclick: () => { this.player.cameraMode = "now"; },
    });
    this.futureButton = new CircleButton({
      renderer: game.renderer,
      position: vec2(275, 75),
      scale: vec2(BUTTON.scale, BUTTON.scale),
      color: 'blue',
      draw: (ctx) => this.drawFutureButton(ctx),
      isSelected: () => this.player.cameraMode === "future",
      onclick: () => { this.player.cameraMode = "future"; },
    });
    this.boostHud = new BoostHud(game.renderer, player, entities);

    canvas.addEventListener("tick", () => {
      this.draw();
    });
  }

  incrementScore(player: number) {
    this.score[player]++;
  }

  draw() {
    /*
    this.ctx.save();
    this.score.forEach((score, player) => {
      this.ctx.shadowColor = "rgba(0,0,0,0.3)";
      this.ctx.shadowOffsetX = 2;
      this.ctx.shadowOffsetY = 2;
      this.ctx.shadowBlur = 5;
      this.ctx.fillStyle = config.colors[player];
      this.ctx.font = `80px PressStart2P`;
      this.ctx.textAlign = player === 0 ? "right" : "left";
      this.ctx.fillText(score.toString(), this.canvas.width / 2 + (100 * (player === 0 ? -1 : 1)) / 2, 110);
    });
    this.ctx.restore();
    */
  }

  drawVisualButton(ctx: WebGLRenderingContext) {
    /*
    const rCosT = BUTTON.radius / Math.sqrt(2);
    ctx.lineWidth = BUTTON.lineWidth / BUTTON.scale;
    ctx.beginPath();
    ctx.moveTo(-rCosT, rCosT);
    ctx.lineTo(0, 0);
    ctx.lineTo(rCosT, rCosT);
    ctx.moveTo(BUTTON.radius, 0);
    ctx.arc(0, 0, BUTTON.radius, 0, 2 * Math.PI);
    ctx.stroke();
    */
  }

  drawNowButton(ctx: WebGLRenderingContext) {
    /*
    ctx.lineWidth = BUTTON.lineWidth / BUTTON.scale;
    ctx.beginPath();
    ctx.moveTo(-BUTTON.radius, 0);
    ctx.lineTo(BUTTON.radius, 0);
    ctx.arc(0, 0, BUTTON.radius, 0, 2 * Math.PI);
    ctx.stroke();
    */
  }

  drawFutureButton(ctx: WebGLRenderingContext) {
    /*
    const rCosT = BUTTON.radius / Math.sqrt(2);
    ctx.lineWidth = BUTTON.lineWidth / BUTTON.scale;
    ctx.beginPath();
    ctx.moveTo(-rCosT, -rCosT);
    ctx.lineTo(0, 0);
    ctx.lineTo(rCosT, -rCosT);
    ctx.moveTo(BUTTON.radius, 0);
    ctx.arc(0, 0, BUTTON.radius, 0, 2 * Math.PI);
    ctx.stroke();
    */
  }
}
