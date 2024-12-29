import { Entity } from "../entity";
import { Game } from "../main";
import { vec2 } from "../types";

const THICKNESS = 5;

export class ReturnWall extends Entity {
    constructor(game: Game, id: string) {
        super(game, id);
    }

    protected drawOld() {
        this.drawLocal(() => {
            /*
            this.ctx.beginPath();
            this.ctx.fillStyle = 'cyan';
            this.ctx.moveTo( 0.5, 0.5);
            this.ctx.lineTo(-0.5, 0.5);
            this.ctx.lineTo(-0.5,-0.5);
            this.ctx.lineTo( 0.5,-0.5);
            this.ctx.closePath();
            this.ctx.fill();
            */
        })
    }
}
