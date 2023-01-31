import { lightConeIntersection } from "./geometry";
import { C, Game } from "./main";
import { Obstacle } from "./obstacle";
import { Rectangle, Tick, TickEvent, vec2, Vec2, vec3, Vec3 } from "./types";

export class Entity {
  readonly id: string;
  /**
   * Position in spacetime at the moment of intersecting the player's backward
   * light cone
   */
  position: Vec3;
  /**
   * Three-velocity (https://en.wikipedia.org/wiki/Four-velocity) at the moment
   * of intersecting the player's backward light cone
   */
  velocity: Vec3;
  /**
   * Proper time for this entity at the moment of intersecting the player's
   * backward light cone
   */
  pt: number;
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
    this.position = vec3(0, 0, 0);
    this.velocity = vec3(1, 0, 0);
    this.scale = vec2(1, 1);
    this.orientation = 0;
    this.pt = 0;

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
    const obstacleRect = this.getObstacleRectangle();
    if (obstacleRect !== undefined) {
      this.obstacle = new Obstacle(this.game.collider, this.game.obstacles, this.id, obstacleRect);
    }

    this.move(0);
  }

  protected move(dt: number): void {
    const { position: oldPosition, velocity } = this;
    const { player } = this.game;
    this.position = lightConeIntersection(player.position, oldPosition, velocity);
    this.pt += (this.position.t - oldPosition.t) / velocity.t;

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
    const { position: playerPos, velocity: playerVel } = this.game.player;
    this.drawWorld(() => {
      this.ctx.save();

      const relPos = this.position.minus(playerPos);
      const relVel = playerVel.inv().boost(this.velocity);
      const o = relPos.boost(relVel).plus(playerPos);
      this.ctx.translate(o.x, o.y);
      this.ctx.rotate(this.orientation);
      this.ctx.scale(this.scale.x, this.scale.y);

      draw();

      this.ctx.restore();
    })
  }

  /**
   * Execute `draw` with the context transformed into camera-relative
   * coordinates. Note that since drawing commands are 2D and don't allow
   * specifying a t coordinate, this can't be fully general; it assumes the t
   * coordinate is equal to that of this entity. That means in practice that
   * world-relative coordinates should be close to the origin of the entity's
   * coordinate system.
   */
  protected drawWorld(draw: () => void): void {
    this.ctx.save();

    // screen-center coordinates
    const { width, height } = this.ctx.canvas;
    this.ctx.translate(width / 2, height / 2);
    // -y for right-hand coordinate system
    this.ctx.scale(C, -C);
    // camera position
    const { position: playerPos, velocity: playerVel } = this.game.player;
    const relPos = this.position.minus(playerPos);
    const relVel = this.velocity.boost(playerVel.inv());
    const o = relPos.boost(relVel);
    const vx = relPos.plus(vec3(0, 1, 0)).boost(relVel).minus(o);
    const vy = relPos.plus(vec3(0, 0, 1)).boost(relVel).minus(o);
    this.ctx.transform(vx.x, vx.y, vy.x, vy.y, -playerPos.x, -playerPos.y);

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
