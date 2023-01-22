import { Audio } from "./audio";
import config from "../../config.json" assert { type: "json" };
import { Collider2d, Polygon, Vector } from "collider2d";
import { Game } from "./main";
import { clamp, rotate } from "./util";
import { Obstacle } from "./obstacle";
import { Theme } from "../../public/themes/theme";
import { Vec2, FinishEvent, GamepadButtonEvent, GamepadStickEvent, Rectangle, Sprite, TickEvent } from "./types";
import { Entity } from "./entity";
import { Opponent } from "./entities/opponent";

export class Player extends Entity {
  position: Vec2;
  obstacle: Obstacle;
  action: {
    movingX: number;
    movingY: number;
    attacking: boolean;
    blocking: boolean;
    cooldown: boolean;
  };

  private playerNum: number;
  private size: number;
  private speed: number;
  private maxVelocity: number;
  private range: number;
  private attackDuration: number;
  private blockDuration: number;
  private cooldownDuration: number;

  constructor(game: Game) {
    super(game, 'player');
    this.playerNum = 0;
    this.size = 100;
    this.position = this.getInitialPosition();
    this.speed = 1;
    this.range = 150;
    this.attackDuration = 200;
    this.blockDuration = 300;
    this.cooldownDuration = 800;
    this.maxVelocity = 20;
    this.obstacle = this.createObstacle(`player${this.playerNum}`);
    this.action = {
      movingX: 0,
      movingY: 0,
      attacking: false,
      blocking: false,
      cooldown: false,
    };

    this.registerControls();

    window.requestAnimationFrame(() => {
      this.move();
      this.turn();
    });

    this.ctx.canvas.addEventListener("tick", (event: TickEvent) => {
      this.onNextTick(event);
    });
  }

  private getInitialPosition(): { x: number; y: number } {
    return { x: 50, y: 50 };
  }

  private createObstacle(id: string): Obstacle {
    return new Obstacle(this.game.collider, this.game.obstacles, id, {
      a: { x: this.position.x, y: this.position.y },
      b: { x: this.position.x + this.size, y: this.position.y },
      c: {
        x: this.position.x + this.size,
        y: this.position.y + this.size,
      },
      d: { x: this.position.x, y: this.position.y + this.size },
    });
  }

  private registerControls(): void {
    // move left
    config.controls[this.playerNum].left.forEach((key: string) => {
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
    config.controls[this.playerNum].right.forEach((key: string) => {
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
    config.controls[this.playerNum].up.forEach((key: string) => {
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

    // move down
    config.controls[this.playerNum].down.forEach((key: string) => {
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

    // move by stick
    document.addEventListener("gamepadStickMove", (event: GamepadStickEvent) => {
      if (event.detail?.gamepadId !== this.playerNum || event.detail?.stickIndex !== 0) {
        return;
      }

      this.action.movingX = event.detail.stick.x;
      this.action.movingY = event.detail.stick.y;
    });

    // attack
    config.controls[this.playerNum].attack.forEach((key: string) => {
      document.addEventListener("keydown", (event: KeyboardEvent) => {
        if (this.active && event.code === key && event.repeat === false && !this.action.cooldown) {
          this.action.attacking = true;
        }
      });

      document.addEventListener("gamepadButtonDown", (event: GamepadButtonEvent) => {
        if (
          event.detail?.gamepadId === this.playerNum &&
          event.detail.buttonIndex === config.gamepad.attack &&
          !this.action.cooldown
        ) {
          this.action.attacking = true;
        }
      });
    });

    // block
    config.controls[this.playerNum].block.forEach((key: string) => {
      document.addEventListener("keydown", (event: KeyboardEvent) => {
        if (this.active && event.code === key && event.repeat === false && !this.action.cooldown) {
          this.action.blocking = true;
        }
      });

      document.addEventListener("gamepadButtonDown", (event: GamepadButtonEvent) => {
        if (
          event.detail?.gamepadId === this.playerNum &&
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
    this.active = active;
  }

  private collide(): void {
    const obstacles = this.game.obstacles.filter((obstacle) => obstacle.getId() !== this.obstacle.getId());
    obstacles.forEach((obstacle) => {
      const collision = this.obstacle.collidesWith(obstacle);
      const friction = 0.8;

      if (!collision) {
        return;
      }

      this.velocity.x = (this.velocity.x + collision.overlapV.x * -1) * friction;
      this.velocity.y = (this.velocity.y + collision.overlapV.y * -1) * friction;
    });
  }

  private move(): void {
    const { position, velocity, action } = this;
    const newX = position.x + action.movingX * this.speed + velocity.x * this.speed;
    const newY = position.y + action.movingY * this.speed + velocity.y * this.speed;

    position.x = newX;
    position.y = newY;

    this.obstacle.editObstacle({
      a: { x: position.x, y: position.y },
      b: { x: position.x + this.size, y: position.y },
      c: { x: position.x + this.size, y: position.y + this.size },
      d: { x: position.x, y: position.y + this.size },
    });

    this.velocity.x = clamp(
      (action.movingX ? this.velocity.x + action.movingX : this.velocity.x * 0.8) * this.speed,
      this.maxVelocity * -1,
      this.maxVelocity
    );
    this.velocity.y = clamp(
      (action.movingY ? this.velocity.y + action.movingY : this.velocity.y * 0.8) * this.speed,
      this.maxVelocity * -1,
      this.maxVelocity
    );
  }

  private turn(): void {
    const opponentId = 0;
    const orientationTarget: Vec2 = this.game.entities[opponentId]?.position || { x: 0, y: 0 };
    const angle = Math.atan2(orientationTarget.y - this.position.y, orientationTarget.x - this.position.x);
    this.orientation = angle;

    const obstacle = {
      a: { x: this.position.x, y: this.position.y },
      b: { x: this.position.x + this.size, y: this.position.y },
      c: {
        x: this.position.x + this.size,
        y: this.position.y + this.size,
      },
      d: { x: this.position.x, y: this.position.y + this.size },
    };

    const rotatedObstacle = rotate(
      {
        a: { x: this.position.x, y: this.position.y },
        b: { x: this.position.x + this.size, y: this.position.y },
        c: {
          x: this.position.x + this.size,
          y: this.position.y + this.size,
        },
        d: { x: this.position.x, y: this.position.y + this.size },
      },
      this.orientation
    );

    this.obstacle.editObstacle(rotatedObstacle);
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
        a: { x: this.position.x, y: this.position.y },
        b: {
          x: this.position.x + this.size + this.range,
          y: this.position.y,
        },
        c: {
          x: this.position.x + this.size + this.range,
          y: this.position.y + this.size,
        },
        d: { x: this.position.x, y: this.position.y + this.size },
      },
      this.orientation,
      { x: this.range / 2, y: 0 } // todo: this works only by chance. need to refactor!
    );
  }

  private strike(): void {
    const opponent = this.game.entities[0] as Opponent;
    const otherPlayer: Rectangle = opponent.obstacle?.getObject();

    const blocked = opponent.action.blocking;
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

    const hit = this.game.collider.testPolygonPolygon(weaponPolygon, otherPlayerPolygon) as boolean;
    if (hit) {
      this.finish();
    }
  }

  private finish(): void {
    const finish: FinishEvent = new CustomEvent("countdown", {
      detail: {
        winner: this.playerNum,
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
    this.position = this.getInitialPosition();
    this.velocity = { x: 0, y: 0 };
    this.move();
    window.requestAnimationFrame(() => {
      this.turn();
    });
  }

  private draw(frameCount: number): void {
    this.ctx.save();
    const { width, height } = this.ctx.canvas;
    this.ctx.translate(width / 2, height / 2);

    // player-local transformation
    this.ctx.save();

    this.ctx.rotate(this.orientation);
    this.ctx.scale(this.size, -this.size);

    // body
    const playerColor = '#368dc8';
    this.ctx.shadowColor = playerColor;
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = playerColor;
    this.ctx.beginPath();
    this.ctx.arc(0.25, 0, 0.15, 0, 2 * Math.PI);
    this.ctx.lineTo(-0.5, 0);
    this.ctx.lineTo(-1, 0.5);
    this.ctx.lineTo(1, 0);
    this.ctx.lineTo(-1, -0.5);
    this.ctx.lineTo(-0.5, 0);
    this.ctx.closePath();
    this.ctx.fill("evenodd");

    this.ctx.restore();

    // draw weapon in absolute space (but still with relative camera)
    this.ctx.translate(-this.position.x, -this.position.y);
    if (this.action.attacking && this.active) {
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
    }
    this.ctx.restore();
  }

  private executeCharacterActions(): void {
    if (this.active) {
      this.move();
      this.turn();
      this.collide();
      this.attack();
      this.block();
    }
  }

  private onNextTick(tick: TickEvent): void {
    this.executeCharacterActions();

    if (tick.detail !== undefined) {
      for (let i = 0; i < tick.detail.frameSkip; i++) {
        this.executeCharacterActions();
      }
      this.draw(tick.detail.frameCount);
    }
  }
}
