import { Buffer, Entity } from "../entity";
import { Game } from "../main";
import { vec2 } from "../types";

const THICKNESS = 5;

class Wall extends Entity {
    private offsetBuffer: Buffer;
    private colorBuffer: Buffer;

    constructor(game: Game, id: string) {
        super(game, id);
    }

    protected initDrawCalls() {
        const maxX = Math.ceil(this.scale.x / 10);
        const maxY = Math.ceil(this.scale.y / 10);
        const [dx, dy] = [1 / maxX, 1 / maxY];

        const offsets = [...Array(maxX).keys()].flatMap(xi => {
            const x = (xi - maxX * 0.5) * dx;
            return [...Array(maxY).keys()].flatMap(yi => {
                const y = (yi - maxY * 0.5) * dy;
                return [
                    [x, y], [x + dx, y], [x, y + dy],
                    [x, y + dy], [x + dx, y], [x + dx, y + dy],
                ];
            })
        });
        this.offsetBuffer = this.buildBuffer({ data: offsets, name: "offsetBuffer" });
        this.colorBuffer = this.buildBuffer({ data: offsets.map(() => this.color), name: "colorBuffer" });

        const gl = this.ctx;
        this.drawCalls.push({
            offsetBuffer: this.offsetBuffer,
            colorBuffer: this.colorBuffer,
            vertexCount: maxX * maxY * 6,
            mode: gl.TRIANGLES,
        });
    }

    protected get color() { return [1, 1, 1]; }
}

export class ReturnWall extends Wall {
    constructor(game: Game, id: string) {
        super(game, id);
    }

    protected get color() { return [1, 0.8, 0]; }
}

export class ReflectWall extends Wall {
    constructor(game: Game, id: string) {
        super(game, id);
    }

    protected get color() { return [0, 0.8, 1]; }
}
