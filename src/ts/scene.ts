import { Theme } from "../../public/themes/theme";
import { Game } from "./main";
import { Obstacle } from "./obstacle";
import { TickEvent } from "./types";

export class Scene {
  private ctx: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private theme: Theme;
  private width: number;
  private height: number;
  private obstacles: Obstacle[];

  constructor(game: Game, theme: Theme) {
    this.ctx = game.renderer.ctx;
    this.canvas = game.renderer.canvas;
    this.theme = theme;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.obstacles = this.theme.config.obstacles.map(
      (obstacle, i) =>
        new Obstacle(
          game.collider,
          game.obstacles,
          `scene${i}`,
          obstacle
        )
    );

    this.canvas.addEventListener("tick", (event: TickEvent) => {
      if (event.detail !== undefined) {
        this.draw(event.detail.frameCount);
      }
    });
  }

  private draw(frameCount: number) {
    this.theme.drawSprite(
      this.ctx,
      this.theme.config.scene.name,
      { x: 0, y: 0 },
      frameCount
    );
  }
}
