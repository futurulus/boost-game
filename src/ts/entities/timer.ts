import { Buffer, Entity } from "../entity";
import { Game } from "../main";
import { vec2 } from "../types";
import { positiveMod } from "../util";

const SIZE = 20;
const RADIUS_RATIO = 0.6;
const INNER_TICK = 1;
const OUTER_TICK = 10;

const COLORS = [
    [.5, 0., 0.],
    [1., 1., 0.],
    [0., .5, 0.],
    [0., 1., 1.],
    [0., 0., .5],
    [1., 0., 1.],
];

export class Timer extends Entity {
    private offsetBuffer: Buffer;
    private colorBuffer: Buffer;

    constructor(game: Game, id: string) {
        super(game, id);
        this.scale = vec2(SIZE, SIZE);
        this.pt = 0;
    }

    protected initDrawCalls() {
        const rr = RADIUS_RATIO;
        this.offsetBuffer = this.buildBuffer({
            data: [
                [0, 1],    [-1, 0],   [1, 0],
                [1, 0],    [-1, 0],   [0, -1],
                [0, rr],    [-rr, 0],   [rr, 0],
                [rr, 0],    [-rr, 0],   [0, -rr],
            ],
            name: "offsetBuffer",
        });
        this.colorBuffer = this.buildBuffer({
            data: new Array(12).fill(COLORS[0]),
            name: "colorBuffer",
        });

        const gl = this.ctx;
        this.drawCalls.push({
            offsetBuffer: this.offsetBuffer,
            colorBuffer: this.colorBuffer,
            vertexCount: 12,
            mode: gl.TRIANGLES,
        });
    }

    protected updateDrawCalls() {
        const innerColor = COLORS[Math.floor(positiveMod(this.pt / INNER_TICK, COLORS.length))];
        const outerColor = COLORS[Math.floor(positiveMod(this.pt / OUTER_TICK, COLORS.length))];
        this.setBufferData(
            this.colorBuffer,
            new Array(12).fill(0).map((_, i) => i < 6 ? outerColor : innerColor),
        );
    }
}
