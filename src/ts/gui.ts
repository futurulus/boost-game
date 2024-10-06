import { Game } from "./main";
import { Player } from "./player";
import { Vec2, vec2 } from "./types";
import { ImageButton } from "./ui/button";
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
  private visualButton: ImageButton;
  private nowButton: ImageButton;
  private futureButton: ImageButton;
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

    this.visualButton = new ImageButton({
      renderer: game.renderer,
      position: vec2(75, 75),
      scale: vec2(BUTTON.scale, BUTTON.scale),
      color: [0.8, 0.8, 0.8],
      image: "assets/visual.png",
      isSelected: () => this.player.cameraMode === "visual",
      onclick: () => { this.player.cameraMode = "visual"; },
    });
    this.nowButton = new ImageButton({
      renderer: game.renderer,
      position: vec2(175, 75),
      scale: vec2(BUTTON.scale, BUTTON.scale),
      color: [1, 0, 0],
      image: "assets/now.png",
      isSelected: () => this.player.cameraMode === "now",
      onclick: () => { this.player.cameraMode = "now"; },
    });
    this.futureButton = new ImageButton({
      renderer: game.renderer,
      position: vec2(275, 75),
      scale: vec2(BUTTON.scale, BUTTON.scale),
      color: [0.2, 0.2, 1],
      image: "assets/future.png",
      isSelected: () => this.player.cameraMode === "future",
      onclick: () => { this.player.cameraMode = "future"; },
    });
    this.boostHud = new BoostHud(game.renderer, player, entities);
  }

  incrementScore(player: number) {
    this.score[player]++;
  }
}
