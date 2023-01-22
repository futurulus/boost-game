import config from "../../config.json" assert { type: "json" };

export class Gui {
  private ctx: CanvasRenderingContext2D;
  private players: number;
  private score: number[];

  constructor(ctx: CanvasRenderingContext2D, players: number) {
    this.ctx = ctx;
    this.score = [];
    this.score.length = players;
    this.score.fill(0);

    this.ctx.canvas.addEventListener("tick", () => {
      this.draw();
    });
  }

  incrementScore(player: number) {
    this.score[player]++;
  }

  draw() {
    this.ctx.save();
    this.score.forEach((score, player) => {
      this.ctx.shadowColor = "rgba(0,0,0,0.3)";
      this.ctx.shadowOffsetX = 2;
      this.ctx.shadowOffsetY = 2;
      this.ctx.shadowBlur = 5;
      this.ctx.fillStyle = config.colors[player];
      this.ctx.font = `80px PressStart2P`;
      this.ctx.textAlign = player === 0 ? "right" : "left";
      this.ctx.fillText(score.toString(), this.ctx.canvas.width / 2 + (100 * (player === 0 ? -1 : 1)) / 2, 110);
    });
    this.ctx.restore();
  }
}
