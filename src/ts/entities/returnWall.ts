import { Entity } from "../entity";
import { Game } from "../main";
import { vec2 } from "../types";

const THICKNESS = 5;

export class ReturnWall extends Entity {
    constructor(game: Game, id: string) {
        super(game, id);
    }
}
