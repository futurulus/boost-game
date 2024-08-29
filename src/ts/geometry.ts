import { C, C_INV_SQ, Vec3 } from "./types";

export const lightConeIntersection = (
  linePosition: Vec3, lineVelocity: Vec3, lightConePosition: Vec3, which: "past" | "future" = "past"
) => {
  const lineVel2 = lineVelocity.vel2();
  /** xy coordinates (relative to lightConePosition) of the point on the line
      where t = lightConePosition.t */
  const p0 = nowIntersection(linePosition, lineVelocity, lightConePosition).minus(lightConePosition).space();
  const dot = p0.dot(lineVel2) * C_INV_SQ;
  const invGammaSq = 1 - lineVel2.magSq() * C_INV_SQ;

  /** `+` and `-` in the numerator give the future and past light cones, respectively. */
  const sign = which === "future" ? 1 : -1;
  /** TODO: this is the quadratic formula applied to line-cone intersection.
      Put the math back in the comments (I had this written out, why did I delete it?) */
  const t = (
    dot + sign * Math.sqrt(dot * dot + invGammaSq * p0.magSq() * C_INV_SQ)
  ) / invGammaSq + lightConePosition.t - linePosition.t;
  return linePosition.plus(lineVelocity.times(t / lineVelocity.t));
}

/** Point on line where t = nowPosition.t */
export const nowIntersection = (
  linePosition: Vec3, lineVelocity: Vec3, nowPosition: Vec3, nowVelocity?: Vec3
) => {
  let relPosition = linePosition.minus(nowPosition), relVelocity = lineVelocity;
  if (nowVelocity !== undefined) {
    const invVel = nowVelocity.inv();
    relPosition = relPosition.boost(invVel);
    relVelocity = relVelocity.boost(invVel);
  }

  const relResult = relPosition.plus(relVelocity.times(-relPosition.t / relVelocity.t));
  return nowPosition.plus(nowVelocity === undefined ? relResult : relResult.boost(nowVelocity));
}