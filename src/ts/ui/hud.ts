import { mat4 } from "gl-matrix";
import { Entity } from "../entity";
import { getMousePos } from "../gui";
import { Player } from "../player";
import { Renderer } from "../render";
import { C, vec2, Vec2, vec3, Vec3 } from "../types";
import { Text } from "./text";

const ARROW_RADIUS = 10;
const MAX_SCREEN_BOOST = 400;
const MAX_BOOST = C;

export class BoostHud {
  private renderer: Renderer;
  private player: Player;
  private entities: Entity[];
  private texture: WebGLTexture;
  private positionBuffer: WebGLBuffer;
  private texCoordBuffer: WebGLBuffer;
  private centsText: Text;

  constructor(renderer: Renderer, player: Player, entities: Entity[]) {
    this.player = player;
    this.renderer = renderer;
    this.entities = entities;

    this.centsText = new Text({
      renderer,
      text: "¡Hello world!",
      fontImage: "assets/font.png",
      position: vec2(100, 100),
      color: [0, 0.5, 1, 0.5],
    })
    this.centsText.isEnabled = false;

    this.initBuffers();

    const canvas = renderer.canvas;
    canvas.addEventListener("mousedown", (event: MouseEvent) => {
      const mousePos = getMousePos(event.clientX, event.clientY, canvas, "world");
      if (mousePos.mag() < player.scale.x) {
        this.player.action.plannedBoost = this.clipPlannedBoost(mousePos);
        this.updateCentsText();
      }
    });

    canvas.addEventListener("mousemove", (event: MouseEvent) => {
      if (this.player.action.plannedBoost === null) return;

      const mousePos = getMousePos(event.clientX, event.clientY, canvas, "world");
      this.player.action.plannedBoost = this.clipPlannedBoost(mousePos);
      this.updateCentsText();
    });

    canvas.addEventListener("mouseup", (event: MouseEvent) => {
      if (this.player.action.plannedBoost === null) return;
      this.player.velocity = this.screenToBoost(this.player.action.plannedBoost)
        .boost(this.player.velocity);
      this.player.action.plannedBoost = null;
      this.updateCentsText();
    });

    canvas.addEventListener("tick", () => this.draw());
  }

  private initBuffers() {
    const gl = this.renderer.ctx;

    const positionBuffer = gl.createBuffer();
    if (positionBuffer === null) throw "Unable to create position buffer";
    this.positionBuffer = positionBuffer;

    this.texture = this.renderer.loadTexture(null);

    // Flip image pixels into the bottom-to-top order that WebGL expects.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    const texCoordBuffer = gl.createBuffer();
    if (texCoordBuffer === null) throw "Unable to create texture coordinate buffer";
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);

    const textureCoordinates = [
      0, 0,  0, 0,  0, 0,  0, 0
    ];

    gl.bufferData(
      gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW
    );
    this.texCoordBuffer = texCoordBuffer;
  }

  private clipPlannedBoost(screen: Vec2): Vec2 {
    const mag = screen.mag();
    return mag < MAX_SCREEN_BOOST ? screen : screen.times(MAX_SCREEN_BOOST / mag);
  }

  private screenToBoost(screen: Vec2): Vec3 {
    const screenMag = screen.mag();
    if (screenMag === 0) return vec3(1, 0, 0);
    // Max boost 1.0 (100¢) at 400px, magnitude scales as square of the screen length
    let boostMag = screenMag / (MAX_SCREEN_BOOST);
    boostMag = MAX_BOOST * boostMag * boostMag;
    return screen.times(boostMag / screenMag).spaceToVel3();
  }

  private boostToScreen(boost: Vec3): Vec2 {
    const boostMag = boost.space().mag();
    // b = B (s/S)^2  =>  s = S √(b/B)
    const screenMag = Math.sqrt(boostMag / MAX_BOOST) * MAX_SCREEN_BOOST;
    return boost.space().times(screenMag / boostMag);
  }

  draw() {
    if (this.player.action.plannedBoost !== null) {
      const { ctx: gl, canvas, ui } = this.renderer;

      gl.useProgram(ui.program);

      const viewScreenTransform = mat4.create();
      const { width: w, height: h } = canvas;
      // Transform screen coordinates to normalized device coordinates [-1, 1]^3
      mat4.ortho(viewScreenTransform, -w/2, w/2, -h/2, h/2, -1, 1);
      // Force the z coordinate to be equal to the object's configured z-depth
      const depth = 0.4;  // TODO: z-ordering of objects
      mat4.translate(viewScreenTransform, viewScreenTransform, [0, 0, depth]);
      mat4.scale(viewScreenTransform, viewScreenTransform, [1, 1, 0]);
      gl.uniformMatrix4fv(ui.uniforms.viewScreenTransform, false, viewScreenTransform);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);

      const { plannedBoost: screen } = this.player.action;
      const plannedBoost = this.screenToBoost(screen);
      const plannedVel = plannedBoost.boost(this.player.velocity);
      this.entities.forEach(e => {
        if (e.id === "player" || e.id === "playerTimer") return;
        const entityVel = this.boostToScreen(e.velocity.boost(plannedVel.inv()).inv());
        const entityPos = e.viewPosition.space();
        this.drawArrow(entityPos, entityPos.plus(entityVel), [1, 0.5, 0, 0.5]);
      });

      // Draw the player arrow last so it's easiest to see
      this.drawArrow(vec2(0, 0), screen, [0, 0.5, 1, 0.5]);
    }
  }

  private updateCentsText() {
    const { plannedBoost: screen } = this.player.action;
    this.centsText.isEnabled = (screen !== null);
    if (screen === null) return;

    const { width: w, height: h } = this.renderer.canvas;
    const plannedBoost = this.screenToBoost(screen);
    const cents = plannedBoost.space().mag() * 100 / C;
    const decimalPlaces = cents < 2 ? 1 : 0;
    const textPos = screen.plus(screen.times(30 / screen.mag()));
    this.centsText.props.text = `${cents.toFixed(decimalPlaces)}¢`
    this.centsText.props.position = vec2(w / 2 + textPos.x, h / 2 - textPos.y);
  }

  drawArrow(start: Vec2, end: Vec2, color: [number, number, number, number]) {
    const { ctx: gl, ui } = this.renderer;

    const diff = end.minus(start);
    const length = diff.mag();
    // Normalized diff, chopped down to ARROW_RADIUS (or extended, or just set
    // to the +x direction to avoid division by 0)
    const nd = length >= 1 ? diff.times(ARROW_RADIUS / length) : vec2(ARROW_RADIUS, 0);
    // If too short for arrow, just draw a square
    const endPoint = length > ARROW_RADIUS ? end : start.plus(nd);
    const positions = [
      endPoint.x, endPoint.y,
      start.x - nd.y, start.y + nd.x,
      start.x - nd.x, start.y - nd.y,
      start.x + nd.y, start.y - nd.x,
    ];
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    ui.attrib({key: "vertexPosition", buffer: this.positionBuffer, numComponents: 2});
    ui.attrib({key: "texCoord", buffer: this.texCoordBuffer, numComponents: 2});

    const vertexCount = 4;

    gl.uniform1i(ui.uniforms.image, 0);
    gl.uniform4fv(ui.uniforms.color, color);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexCount);
  }
}