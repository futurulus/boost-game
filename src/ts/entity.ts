import { Game } from "./main";
import { Obstacle } from "./obstacle";
import { Rectangle, Tick, TickEvent, Vec2 } from "./types";

export class Entity {
  readonly id: string;
  position: Vec2;
  velocity: Vec2;
  scale: Vec2;
  orientation: number;
  obstacle?: Obstacle;

  protected game: Game;
  protected ctx: CanvasRenderingContext2D;
  protected active: boolean;

  constructor(game: Game, id: string) {
    this.game = game;
    this.ctx = game.ctx;
    this.active = false;

    this.id = id;
    this.position = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.scale = { x: 1, y: 1 };
    this.orientation = 0;
    const obstacleRect = this.getObstacleRectangle();
    if (obstacleRect !== undefined) {
      this.obstacle = new Obstacle(this.game.collider, this.game.obstacles, this.id, obstacleRect);
    }

    window.requestAnimationFrame(() => {
      this.initialize();
    });

    this.ctx.canvas.addEventListener("tick", (event: TickEvent) => {
      this.onNextTick(event);
    });
  }

  public setActive(active: boolean): void {
    this.active = active;
  }

  protected getObstacleRectangle(): Rectangle | undefined {
    return undefined;
  }

  protected initialize(): void {
    this.move(0);
  }

  protected move(dt: number): void {
    const { position, velocity } = this;
    const newX = position.x + velocity.x * dt;
    const newY = position.y + velocity.y * dt;

    position.x = newX;
    position.y = newY;

    if (this.obstacle !== undefined) {
      const newObstacleRect = this.getObstacleRectangle();
      if (newObstacleRect !== undefined) {
        this.obstacle?.editObstacle(newObstacleRect);
      }
    }
  }

  private onNextTick(event: TickEvent): void {
    if (event.detail !== undefined) {
      this.tick(event.detail);
      this.draw();
    }
  }

  /** Execute `draw` with the context transformed into entity-relative coordinates */
  protected drawLocal(draw: () => void): void {
    this.drawWorld(() => {
      this.ctx.save();

      this.ctx.translate(this.position.x, this.position.y);
      this.ctx.rotate(this.orientation);
      this.ctx.scale(this.scale.x, this.scale.y);

      draw();

      this.ctx.restore();
    })
  }

  /** Execute `draw` with the context transformed into camera-relative coordinates */
  protected drawWorld(draw: () => void): void {
    this.ctx.save();

    // screen-center coordinates
    const { width, height } = this.ctx.canvas;
    this.ctx.translate(width / 2, height / 2);
    // -y for right-hand coordinate system
    this.ctx.scale(1, -1);
    // camera position
    const { x: camX, y: camY } = this.game.player.position;
    this.ctx.translate(-camX, -camY);

    draw();

    this.ctx.restore();
  }

  protected draw(): void { }

  protected tick(tick: Tick): void {
    if (this.active) {
      this.move(tick.dt);
    }
  }
}
