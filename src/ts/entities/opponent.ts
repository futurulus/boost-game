import { Polygon, Vector } from "collider2d";

import config from "../../../config.json" assert { type: "json" };
import { Entity } from "../entity";
import { Game } from "../main";
import { FinishEvent, GamepadButtonEvent, GamepadStickEvent, Rectangle, Tick, Vec2 } from "../types";
import { clamp, rotate } from "../util";

export class Opponent extends Entity {
  action: {
    movingX: number;
    movingY: number;
    attacking: boolean;
    blocking: boolean;
    cooldown: boolean;
  };

  private speed: number;
  private maxVelocity: number;
  private range: number;
  private attackDuration: number;
  private blockDuration: number;
  private cooldownDuration: number;

  constructor(game: Game, id: string) {
    super(game, id);
    this.speed = 400;
    this.range = 150;
    this.attackDuration = 200;
    this.blockDuration = 300;
    this.cooldownDuration = 800;
    this.maxVelocity = 1000;
    this.position = { x: 250, y: 250 };
    this.scale = { x: 50, y: 50 };
    this.action = {
      movingX: 0,
      movingY: 0,
      attacking: false,
      blocking: false,
      cooldown: false,
    };

    this.registerControls();
  }

  protected getObstacleRectangle(): Rectangle {
    return rotate({
      a: { x: this.position.x - this.scale.x, y: this.position.y - this.scale.y },
      b: { x: this.position.x + this.scale.x, y: this.position.y - this.scale.y },
      c: { x: this.position.x + this.scale.x, y: this.position.y + this.scale.y },
      d: { x: this.position.x - this.scale.x, y: this.position.y + this.scale.y },
    }, this.orientation);
  }

  private registerControls(): void {
    // move left
    const playerNum = 1;
    const controls = config.controls[playerNum];
    controls.left.forEach((key: string) => {
      document.addEventListener("keydown", (event: KeyboardEvent) => {
        this.captureEvent(event);
        if (event.code === key && event.repeat === false) {
          this.action.movingX = -1;
        }
      });
      document.addEventListener("keyup", (event: KeyboardEvent) => {
        this.captureEvent(event);
        if (event.code === key) {
          this.action.movingX = 0;
        }
      });
    });

    // move right
    controls.right.forEach((key: string) => {
      document.addEventListener("keydown", (event: KeyboardEvent) => {
        this.captureEvent(event);
        if (event.code === key && event.repeat === false) {
          this.action.movingX = 1;
        }
      });
      document.addEventListener("keyup", (event: KeyboardEvent) => {
        this.captureEvent(event);
        if (event.code === key) {
          this.action.movingX = 0;
        }
      });
    });

    // move up
    controls.up.forEach((key: string) => {
      document.addEventListener("keydown", (event: KeyboardEvent) => {
        this.captureEvent(event);
        if (event.code === key && event.repeat === false) {
          this.action.movingY = 1;
        }
      });
      document.addEventListener("keyup", (event: KeyboardEvent) => {
        this.captureEvent(event);
        if (event.code === key) {
          this.action.movingY = 0;
        }
      });
    });

    // move down
    controls.down.forEach((key: string) => {
      document.addEventListener("keydown", (event: KeyboardEvent) => {
        this.captureEvent(event);
        if (event.code === key && event.repeat === false) {
          this.action.movingY = -1;
        }
      });
      document.addEventListener("keyup", (event: KeyboardEvent) => {
        this.captureEvent(event);
        if (event.code === key) {
          this.action.movingY = 0;
        }
      });
    });

    // move by stick
    document.addEventListener("gamepadStickMove", (event: GamepadStickEvent) => {
      if (event.detail?.gamepadId !== playerNum || event.detail?.stickIndex !== 0) {
        return;
      }

      this.action.movingX = event.detail.stick.x;
      this.action.movingY = event.detail.stick.y;
    });

    // attack
    controls.attack.forEach((key: string) => {
      document.addEventListener("keydown", (event: KeyboardEvent) => {
        if (this.active && event.code === key && event.repeat === false && !this.action.cooldown) {
          this.action.attacking = true;
        }
      });

      document.addEventListener("gamepadButtonDown", (event: GamepadButtonEvent) => {
        if (
          event.detail?.gamepadId === playerNum &&
          event.detail.buttonIndex === config.gamepad.attack &&
          !this.action.cooldown
        ) {
          this.action.attacking = true;
        }
      });
    });

    // block
    controls.block.forEach((key: string) => {
      document.addEventListener("keydown", (event: KeyboardEvent) => {
        if (this.active && event.code === key && event.repeat === false && !this.action.cooldown) {
          this.action.blocking = true;
        }
      });

      document.addEventListener("gamepadButtonDown", (event: GamepadButtonEvent) => {
        if (
          event.detail?.gamepadId === playerNum &&
          event.detail.buttonIndex === config.gamepad.block &&
          !this.action.cooldown
        ) {
          this.action.blocking = true;
        }
      });
    });
  }

  private captureEvent(event: KeyboardEvent): void {
    if (
      event.target === this.ctx.canvas &&
      config.controls.find((x) => Object.values(x).some((y) => y.includes(event.code)))
    ) {
      event.preventDefault();
    }
  }

  public setActive(active: boolean): void {
    this.reset();
    super.setActive(active);
  }

  private collide(): void {
    const thisObstacle = this.obstacle;
    if (thisObstacle === undefined) return;
    const obstacles = this.game.obstacles.filter((obstacle) => obstacle.getId() !== thisObstacle.getId());
    obstacles.forEach((obstacle) => {
      const collision = thisObstacle.collidesWith(obstacle);
      const friction = 0.8;

      if (!collision) {
        return;
      }

      this.velocity.x = (this.velocity.x + collision.overlapV.x * -1) * friction;
      this.velocity.y = (this.velocity.y + collision.overlapV.y * -1) * friction;
    });
  }

  protected move(dt: number): void {
    const { action } = this;
    const reduction = Math.pow(0.8, dt * 60);
    this.velocity.x = clamp(
      action.movingX ? this.velocity.x + action.movingX * this.speed * dt : this.velocity.x * reduction,
      this.maxVelocity * -1,
      this.maxVelocity
    );
    this.velocity.y = clamp(
      action.movingY ? this.velocity.y + action.movingY * this.speed * dt : this.velocity.y * reduction,
      this.maxVelocity * -1,
      this.maxVelocity
    );

    super.move(dt);
  }

  private turn(): void {
    const orientationTarget: Vec2 = this.game.player.position || { x: 0, y: 0 };
    const angle = Math.atan2(orientationTarget.y - this.position.y, orientationTarget.x - this.position.x);
    this.orientation = angle;
  }

  private attack(): void {
    if (!this.active || !this.action.attacking || this.action.cooldown) {
      return;
    }

    this.action.cooldown = true;

    // strike duration
    window.setTimeout(() => {
      this.action.attacking = false;
    }, this.attackDuration);

    // cooldown to next attack/block
    window.setTimeout(() => {
      this.action.cooldown = false;
    }, this.cooldownDuration);

    this.strike();
  }

  private getWeaponPosition(): Rectangle {
    return rotate(
      {
        a: { x: this.position.x - this.scale.x, y: this.position.y - this.scale.y },
        b: {
          x: this.position.x + this.scale.x + this.range,
          y: this.position.y - this.scale.y,
        },
        c: {
          x: this.position.x + this.scale.x + this.range,
          y: this.position.y + this.scale.y,
        },
        d: { x: this.position.x - this.scale.x, y: this.position.y + this.scale.y },
      },
      this.orientation,
      { x: this.range / 2, y: 0 } // todo: this works only by chance. need to refactor!
    );
  }

  private strike(): void {
    const { collider, player } = this.game;
    const otherPlayer = player.obstacle?.getObject();
    if (otherPlayer === undefined) return;

    const blocked = player.action.blocking;
    if (blocked) {
      return;
    }

    const otherPlayerPolygon = new Polygon(new Vector(0, 0), [
      new Vector(otherPlayer.a.x, otherPlayer.a.y),
      new Vector(otherPlayer.b.x, otherPlayer.b.y),
      new Vector(otherPlayer.c.x, otherPlayer.c.y),
      new Vector(otherPlayer.d.x, otherPlayer.d.y),
    ]);

    const weaponPosition = this.getWeaponPosition();
    const weaponPolygon = new Polygon(new Vector(0, 0), [
      new Vector(weaponPosition.a.x, weaponPosition.a.y),
      new Vector(weaponPosition.b.x, weaponPosition.b.y),
      new Vector(weaponPosition.c.x, weaponPosition.c.y),
      new Vector(weaponPosition.d.x, weaponPosition.d.y),
    ]);

    const hit = collider.testPolygonPolygon(weaponPolygon, otherPlayerPolygon) as boolean;
    if (hit) {
      this.finish();
    }
  }

  private finish(): void {
    const playerNum = 1;
    const finish: FinishEvent = new CustomEvent("countdown", {
      detail: {
        winner: playerNum,
      },
    });
    this.ctx.canvas.dispatchEvent(finish);
  }

  private block(): void {
    if (!this.action.blocking || this.action.cooldown) {
      return;
    }

    this.action.cooldown = true;

    // block duration
    window.setTimeout(() => {
      this.action.blocking = false;
    }, this.blockDuration);

    // cooldown to next attack/block
    window.setTimeout(() => {
      this.action.cooldown = false;
    }, this.cooldownDuration);
  }

  private reset(): void {
    this.position = { x: 250, y: 250 };
    this.velocity = { x: 0, y: 0 };
    this.move(0);
    window.requestAnimationFrame(() => {
      this.turn();
    });
  }

  protected draw(): void {
    this.drawLocal(() => {
      // body
      const opponentColor = "#d3b447";
      this.ctx.shadowColor = opponentColor;
      this.ctx.shadowBlur = 10;
      this.ctx.fillStyle = opponentColor;
      this.ctx.fillRect(-1, -1, 2, 2);

      // face
      this.ctx.shadowColor = "#ff00ff";
      this.ctx.shadowBlur = 8;
      this.ctx.fillStyle = "#ff00ff";
      this.ctx.fillRect(0.8, -1, 0.2, 2);
    })

    if (this.action.attacking && this.active) {
      this.drawWorld(() => {
        const weaponPosition = this.getWeaponPosition();
        this.ctx.fillStyle = "#ff0000";
        this.ctx.moveTo(weaponPosition.a.x, weaponPosition.a.y);
        this.ctx.beginPath();
        this.ctx.lineTo(weaponPosition.b.x, weaponPosition.b.y);
        this.ctx.lineTo(weaponPosition.c.x, weaponPosition.c.y);
        this.ctx.lineTo(weaponPosition.d.x, weaponPosition.d.y);
        this.ctx.lineTo(weaponPosition.a.x, weaponPosition.a.y);
        this.ctx.closePath();
        this.ctx.fill();
      });
    }
  }

  protected initialize(): void {
    this.turn();
  }

  protected tick(tick: Tick): void {
    super.tick(tick);
    if (this.active) {
      this.turn();
      this.collide();
      this.attack();
      this.block();
    }
  }
}
