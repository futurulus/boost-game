uniform float cInvSq, sign;
uniform vec3 entityPosition, viewPosition;
uniform vec2 entityVelocity;
attribute vec3 vertexPosition;

void main() {
    vec3 relPosition = linePosition - lightConePosition;
    vec2 p0 = relPosition.xy - lineVelocity2.xy * relPosition.t;
    float p0DotVel = dot(p0, lineVelocity2) * cInvSq;
    float invGammaSq = 1 - dot(lineVelocity2, lineVelocity2) * cInvSq;

    float t = (
        p0DotVel + sign * sqrt(p0DotVel * p0DotVel + invGammaSq * dot(p0, p0) * cInvSq)
    ) / invGammaSq + lightConePosition.t - linePosition.t;
    gl_Position = linePosition + t * lineVelocity2;
}