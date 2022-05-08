import config from '../../config.json' assert { type: 'json' };
import { Collider2d, Polygon, Vector } from 'collider2d';
import { Game } from './main';
import { clamp, rotate } from './util';
import { Obstacle } from './obstacle';

export class Character {
	private ctx: CanvasRenderingContext2D;
	private active: boolean;
	private collider: Collider2d;
	private players: Character[];
	private obstacles: Obstacle[];
	private player: number;
	private size: number;
	private position: coordinates;
	private orientation: number;
	private speed: number;
	private maxVelocity: number;
	private range: number;
	private attackDuration: number;
	private blockDuration: number;
	private cooldownDuration: number;
	private velocity: coordinates;
	private obstacle: Obstacle;
	private action: {
		movingX: -1 | 0 | 1;
		movingY: -1 | 0 | 1;
		attacking: boolean;
		blocking: boolean;
		cooldown: boolean;
	};

	constructor(game: Game, player: number) {
		this.ctx = game.ctx;
		this.active = false;
		this.collider = game.collider;
		this.players = game.players;
		this.obstacles = game.obstacles;
		this.player = player;
		this.size = 100;
		this.position = this.getInitialPosition();
		this.orientation = 0;
		this.speed = 1;
		this.range = 100;
		this.attackDuration = 200;
		this.blockDuration = 300;
		this.cooldownDuration = 800;
		this.maxVelocity = 20;
		this.velocity = {
			x: 0,
			y: 0,
		};
		this.obstacle = this.createObstacle(`player${this.player}`);
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

		this.ctx.canvas.addEventListener('tick', () => {
			this.onNextTick();
		});
	}

	private getInitialPosition(): { x: number; y: number } {
		if (this.player === 0) {
			return { x: 50, y: 50 };
		} else {
			return { x: this.ctx.canvas.width - 50 - this.size, y: this.ctx.canvas.height - 50 - this.size };
		}
	}

	private createObstacle(id: string): Obstacle {
		return new Obstacle(this.collider, this.obstacles, id, {
			a: { x: this.position.x, y: this.position.y },
			b: { x: this.position.x + this.size, y: this.position.y },
			c: { x: this.position.x + this.size, y: this.position.y + this.size },
			d: { x: this.position.x, y: this.position.y + this.size },
		});
	}

	private registerControls(): void {
		// move left
		config.controls[this.player].left.forEach((key: string) => {
			document.addEventListener('keydown', (event: KeyboardEvent) => {
				if (event.code === key && event.repeat === false) {
					this.action.movingX = -1;
				}
			});
			document.addEventListener('keyup', (event: KeyboardEvent) => {
				if (event.code === key) {
					this.action.movingX = 0;
				}
			});
		});

		// move right
		config.controls[this.player].right.forEach((key: string) => {
			document.addEventListener('keydown', (event: KeyboardEvent) => {
				if (event.code === key && event.repeat === false) {
					this.action.movingX = 1;
				}
			});
			document.addEventListener('keyup', (event: KeyboardEvent) => {
				if (event.code === key) {
					this.action.movingX = 0;
				}
			});
		});

		// move up
		config.controls[this.player].up.forEach((key: string) => {
			document.addEventListener('keydown', (event: KeyboardEvent) => {
				if (event.code === key && event.repeat === false) {
					this.action.movingY = -1;
				}
			});
			document.addEventListener('keyup', (event: KeyboardEvent) => {
				if (event.code === key) {
					this.action.movingY = 0;
				}
			});
		});

		// move down
		config.controls[this.player].down.forEach((key: string) => {
			document.addEventListener('keydown', (event: KeyboardEvent) => {
				if (event.code === key && event.repeat === false) {
					this.action.movingY = 1;
				}
			});
			document.addEventListener('keyup', (event: KeyboardEvent) => {
				if (event.code === key) {
					this.action.movingY = 0;
				}
			});
		});

		// attack
		config.controls[this.player].attack.forEach((key: string) => {
			document.addEventListener('keydown', (event: KeyboardEvent) => {
				if (event.code === key && event.repeat === false && !this.action.cooldown) {
					this.action.attacking = true;
				}
			});
		});

		// block
		config.controls[this.player].block.forEach((key: string) => {
			document.addEventListener('keydown', (event: KeyboardEvent) => {
				if (event.code === key && event.repeat === false && !this.action.cooldown) {
					this.action.blocking = true;
				}
			});
		});
	}

	public setActive(active: boolean): void {
		this.reset();
		this.active = active;
	}

	private collide(): void {
		const obstacles = this.obstacles.filter((obstacle) => obstacle.getId() !== this.obstacle.getId());
		obstacles.forEach((obstacle) => {
			if (this.obstacle.collidesWith(obstacle)) {
				this.velocity.x *= -1;
				this.velocity.y *= -1;
				// todo: needs refinement, players can become stuck
			}
		});
	}

	private move(): void {
		const { position, velocity, action } = this;
		const newX = position.x + action.movingX * this.speed + velocity.x * this.speed;
		const newY = position.y + action.movingY * this.speed + velocity.y * this.speed;

		position.x = newX;
		position.y = newY;

		if (position.x < 0) {
			position.x = 0;
		} else if (newX > this.ctx.canvas.width - this.size) {
			position.x = this.ctx.canvas.width - this.size;
		}

		if (position.y < 0) {
			position.y = 0;
		} else if (newY > this.ctx.canvas.height - this.size) {
			position.y = this.ctx.canvas.height - this.size;
		}

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
		const otherPlayer = this.player === 0 ? 1 : 0;
		const orientationTarget: coordinates = this.players[otherPlayer]?.position || { x: 0, y: 0 };
		const angle = Math.atan2(orientationTarget.y - this.position.y, orientationTarget.x - this.position.x);
		this.orientation = angle;

		const rotatedObstacle = rotate(
			{
				a: { x: this.position.x, y: this.position.y },
				b: { x: this.position.x + this.size, y: this.position.y },
				c: { x: this.position.x + this.size, y: this.position.y + this.size },
				d: { x: this.position.x, y: this.position.y + this.size },
			},
			this.orientation
		);
		this.obstacle.editObstacle(rotatedObstacle);
	}

	private attack(): void {
		if (!this.action.attacking || this.action.cooldown) {
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

	private strike(): void {
		const otherPlayerId = this.player === 0 ? 1 : 0;
		const otherPlayer: rectangle = this.players[otherPlayerId].obstacle?.getObject();

		const blocked = this.players[otherPlayerId].action.blocking;
		if (blocked) {
			return;
		}

		const otherPlayerPolygon = new Polygon(new Vector(0, 0), [
			new Vector(otherPlayer.a.x, otherPlayer.a.y),
			new Vector(otherPlayer.b.x, otherPlayer.b.y),
			new Vector(otherPlayer.c.x, otherPlayer.c.y),
			new Vector(otherPlayer.d.x, otherPlayer.d.y),
		]);

		const weaponPosition = rotate(
			{
				a: { x: this.position.x, y: this.position.y },
				b: { x: this.position.x + this.size + this.range, y: this.position.y },
				c: { x: this.position.x + this.size + this.range, y: this.position.y + this.size },
				d: { x: this.position.x, y: this.position.y + this.size },
			},
			this.orientation,
			{ x: this.range / 2, y: 0 } // todo: this works only by chance. need to refactor!
		);

		const weaponPolygon = new Polygon(new Vector(0, 0), [
			new Vector(weaponPosition.a.x, weaponPosition.a.y),
			new Vector(weaponPosition.b.x, weaponPosition.b.y),
			new Vector(weaponPosition.c.x, weaponPosition.c.y),
			new Vector(weaponPosition.d.x, weaponPosition.d.y),
		]);

		const hit = this.collider.testPolygonPolygon(weaponPolygon, otherPlayerPolygon) as boolean;
		if (hit) {
			this.finish();
		}
	}

	private finish(): void {
		const finish: FinishEvent = new CustomEvent('countdown', {
			detail: {
				winner: this.player,
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

	private draw(): void {
		this.ctx.save();
		this.ctx.translate(this.position.x + this.size / 2, this.position.y + this.size / 2);

		this.ctx.rotate(this.orientation);

		// body
		this.ctx.fillStyle = config.theme.player[this.player];
		this.ctx.fillRect(this.size / -2, this.size / -2, this.size, this.size);

		// face
		this.ctx.fillStyle = '#ff00ff';
		this.ctx.fillRect(this.size / 2 - 20, this.size / -2, 20, this.size);

		// weapon
		if (this.action.attacking && this.active) {
			this.ctx.fillStyle = config.theme.weapon;
			this.ctx.fillRect(this.size / 2, this.size / -2, this.range, this.size);
		}

		// shield
		if (this.action.blocking && this.active) {
			this.ctx.fillStyle = config.theme.shield;
			this.ctx.fillRect(this.size / 2 + 20, this.size / -2, 20, this.size);
		}

		this.ctx.restore();
	}

	private onNextTick(): void {
		if (this.active) {
			this.collide();
			this.move();
			this.turn();
			this.attack();
			this.block();
		}
		this.draw();
	}
}
