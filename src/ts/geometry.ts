import { Vec3 } from "./types";

export const lightConeIntersection = (
    lightConePosition: Vec3, linePosition: Vec3, lineVelocity: Vec3
) => {
    const lineVel2 = lineVelocity.vel2();
    const linePosSpace = linePosition.minus(lightConePosition).space();
    // Point on line where t = lightConePosition.t
    const p0 = linePosSpace.minus(lineVel2.times(linePosition.t));
    const dot = p0.dot(lineVel2);
    const invGamma = 1 - lineVel2.magSq();

    // Both + and - in the numerator are solutions, but we want the backwards light cone
    const t = (
        dot - Math.sqrt(dot * dot + invGamma * p0.magSq())
    ) / invGamma + lightConePosition.t - linePosition.t;
    return linePosition.plus(lineVelocity.times(t / lineVelocity.t));
}