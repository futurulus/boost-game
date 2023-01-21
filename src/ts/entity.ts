import { Game } from "./main";
import { Obstacle } from "./obstacle";
import { Vec2 } from "./types";

export class Entity {
  readonly id: string;
  position: Vec2;
  velocity: Vec2;
  orientation: number;
  obstacle: Obstacle;

  protected game: Game;
  protected ctx: CanvasRenderingContext2D;
  protected active: boolean;

  constructor(game: Game, id: string) {
    this.id = id;
    this.position = {
      x: 0,
      y: 0,
    }
    this.velocity = {
      x: 0,
      y: 0,
    };
    this.orientation = 0;

    this.game = game;
    this.ctx = game.ctx;
    this.active = false;
  }

  public setActive(active: boolean): void {
    this.active = active;
  }
}
