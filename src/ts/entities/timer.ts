import { Buffer, Entity } from "../entity";
import { Game } from "../main";
import { Rectangle, vec2 } from "../types";
import { positiveMod } from "../util";

const SIZE = 20;
const RADIUS_RATIO = 0.6;
const INNER_TICK = 1;
const OUTER_TICK = 10;

type Color3 = [number, number, number];
const INNER_COLORS: Color3[] = [
    [.5, 0., 0.],
    [1., 1., 0.],
    [0., .5, 0.],
    [0., 1., 1.],
    [0., 0., .5],
    [1., 0., 1.],
];
const OUTER_COLORS: Color3[] = [
    [1., 0., 0.],
    [1., 1., 0.],
    [0., 1., 0.],
    [0., 1., 1.],
    [0., 0., 1.],
    [1., 0., 1.],
];

const interpolateColor = (c1: Color3, c2: Color3, f: number) => c1.map((x, i) =>
    (1 - f) * x + f * c2[i]
);

export class Timer extends Entity {
    private offsetBuffer: Buffer;
    private colorBuffer: Buffer;

    constructor(game: Game, id: string) {
        super(game, id);
        this.scale = vec2(SIZE, SIZE);
        this.pt = 0;
    }

    protected getObstacleRectangle(): Rectangle | undefined {
        return undefined;
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
            data: new Array(12).fill(OUTER_COLORS[0]),
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
        const innerColor = INNER_COLORS[Math.floor(positiveMod(this.pt / INNER_TICK, INNER_COLORS.length))];
        const outerPhase = positiveMod(this.pt / OUTER_TICK, OUTER_COLORS.length);
        const outerStartIndex = Math.floor(outerPhase);
        const outerColor1 = OUTER_COLORS[outerStartIndex];
        const outerColor2 = OUTER_COLORS[(outerStartIndex + 1) % OUTER_COLORS.length];
        const outerColor = interpolateColor(outerColor1, outerColor2, outerPhase - outerStartIndex)
        this.setBufferData(
            this.colorBuffer,
            new Array(12).fill(0).map((_, i) => i < 6 ? outerColor : innerColor),
        );
    }
}
