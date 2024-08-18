export class Strike {
  ctx: WebGLRenderingContext;
  player: number;
  range: number;

  constructor(ctx: WebGLRenderingContext, player: number, range: number) {
    this.ctx = ctx;
    this.player = player;
    this.range = range;
  }
}
