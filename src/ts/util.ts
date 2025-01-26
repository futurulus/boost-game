import { Rectangle, vec2 } from "./types";

export function rotate(
  object: Rectangle,
  angle: number,
  offset = { x: 0, y: 0 }
): Rectangle {
  const { a, b, c, d } = object;
  const center = {
    x: (a.x + b.x + c.x + d.x) / 4 - offset.x,
    y: (a.y + b.y + c.y + d.y) / 4,
  };
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotatedA = vec2(
    (a.x - center.x) * cos - (a.y - center.y) * sin + center.x,
    (a.x - center.x) * sin + (a.y - center.y) * cos + center.y,
  );
  const rotatedB = vec2(
    (b.x - center.x) * cos - (b.y - center.y) * sin + center.x,
    (b.x - center.x) * sin + (b.y - center.y) * cos + center.y,
  );
  const rotatedC = vec2(
    (c.x - center.x) * cos - (c.y - center.y) * sin + center.x,
    (c.x - center.x) * sin + (c.y - center.y) * cos + center.y,
  );
  const rotatedD = vec2(
    (d.x - center.x) * cos - (d.y - center.y) * sin + center.x,
    (d.x - center.x) * sin + (d.y - center.y) * cos + center.y,
  );

  // todo: offset doesnt work properly yet

  return { a: rotatedA, b: rotatedB, c: rotatedC, d: rotatedD };
}

export function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

export function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result === null) throw new Error(`Invalid hex color ${JSON.stringify(hex)}`);
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/** Modulo (num % denom), but returns positive numbers even if `num` is negative */
export function positiveMod(num: number, denom: number): number {
  return (num % denom) + (num >= 0 ? 0 : denom);
}

export function getVolume(): number {
  const volumeControl = document.getElementById("sound") as HTMLInputElement;
  return parseFloat(volumeControl.value);
}
