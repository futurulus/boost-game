import { Entity } from "../entity";
import { Game } from "../main";
import { Tick } from "../types";

const INNER_RADIUS = 0.6;
const INNER_ANGLE_PERIOD = 2;
const INNER_HUE_PERIOD = 6;
const OUTER_ANGLE_PERIOD = 60;
const OUTER_HUE_PERIOD = 180;

export class Timer extends Entity {
    private t: number;

    constructor(game: Game, id: string) {
        super(game, id);
        this.scale = { x: 20, y: 20 };
        this.t = 0;
    }

    protected tick(tick: Tick) {
        this.t += tick.dt;
    }

    protected draw() {
        this.drawLocal(() => {
            const angleIn = (this.t / (0.5 * INNER_ANGLE_PERIOD) % 1) * 2 * Math.PI;
            const counterclockwiseIn = (this.t / INNER_ANGLE_PERIOD) % 1 > 0.5;
            const hueIn = ((this.t / INNER_HUE_PERIOD) % 1) * 360;
            const angleOut = (this.t / (0.5 * OUTER_ANGLE_PERIOD) % 1) * 2 * Math.PI;
            const counterclockwiseOut = (this.t / OUTER_ANGLE_PERIOD) % 1 > 0.5;
            const hueOut = ((this.t / OUTER_HUE_PERIOD) % 1) * 360;

            this.ctx.rotate(Math.PI / 2);

            // Inner ticker
            this.ctx.beginPath();
            this.ctx.fillStyle = `hsl(${hueIn}deg, 100%, 50%)`;
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(INNER_RADIUS, 0);
            this.ctx.arc(0, 0, INNER_RADIUS, 0, angleIn, counterclockwiseIn);
            this.ctx.lineTo(0, 0);
            this.ctx.closePath();
            this.ctx.fill();

            // Outer ticker
            this.ctx.beginPath();
            this.ctx.fillStyle = `hsl(${hueOut}deg, 100%, 50%)`;
            this.ctx.moveTo(INNER_RADIUS, 0);
            this.ctx.lineTo(1, 0);
            this.ctx.arc(0, 0, 1, 0, angleOut, counterclockwiseOut);
            this.ctx.lineTo(INNER_RADIUS * Math.cos(angleOut), INNER_RADIUS * Math.sin(angleOut));
            this.ctx.arc(0, 0, INNER_RADIUS, angleOut, 0, !counterclockwiseOut);
            this.ctx.lineTo(1, 0);
            this.ctx.closePath();
            this.ctx.fill();
        })
    }
}
