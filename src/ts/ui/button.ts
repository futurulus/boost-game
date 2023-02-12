import { getMousePos } from "../gui";
import { vec2, Vec2 } from "../types";

type Props = {
  ctx: CanvasRenderingContext2D;
  position: Vec2;
  scale: Vec2;
  color: string;
  draw: (ctx: CanvasRenderingContext2D) => void;
  isSelected: () => boolean;
  onclick: () => void;
}

export class CircleButton {
  props: Props;

  private hitPath: Path2D

  constructor(props: Props) {
    this.props = props;

    const { ctx, position, scale } = props;

    this.hitPath = new Path2D();
    this.hitPath.moveTo(position.x + scale.x, position.y);
    this.hitPath.ellipse(position.x, position.y, scale.x, scale.y, 0, 0, 2 * Math.PI);

    ctx.canvas.addEventListener("click", e => this.onClick(e));
    ctx.canvas.addEventListener("tick", () => this.draw());
  }

  onClick(e: MouseEvent) {
    const { ctx, onclick } = this.props;
    const { x, y } = getMousePos(e.clientX, e.clientY, ctx);
    if (!ctx.isPointInPath(this.hitPath, x, y)) return;
    onclick();
  }

  draw() {
    const { ctx, position, scale, color, draw, isSelected } = this.props;

    const selected = isSelected();
    if (selected) {
      ctx.fillStyle = color;
      ctx.fill(this.hitPath)

      ctx.strokeStyle = ctx.fillStyle = 'black';
    } else {
      ctx.strokeStyle = ctx.fillStyle = color;
    }

    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.scale(scale.x, scale.y);
    draw(ctx);
    ctx.restore();
  }
}