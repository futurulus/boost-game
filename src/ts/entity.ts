import { mat4 } from "gl-matrix";
import { lightConeIntersection, nowIntersection } from "./geometry";
import { Game } from "./main";
import { Obstacle } from "./obstacle";
import { C, C_INV_SQ, Rectangle, Tick, TickEvent, vec2, Vec2, vec3, Vec3 } from "./types";

const AXIS_SHRINK = 1e5;

export class Entity {
  readonly id: string;
  /**
   * Proper time for this entity at the moment of intersecting the player's
   * backward light cone
   */
  pt: number;
  scale: Vec2;
  orientation: number;
  obstacle?: Obstacle;

  // position and velocity are properties for caching of lightcone intersections
  private _position: Vec3;
  private _velocity: Vec3;
  private cachedPosition: {
    visual?: Vec3;
    now?: Vec3;
    future?: Vec3;
    view?: Vec3;
  };

  protected game: Game;
  protected ctx: WebGLRenderingContext;
  protected canvas: HTMLCanvasElement;
  protected active: boolean;

  protected positionBuffer: WebGLBuffer;
  protected colorBuffer: WebGLBuffer;

  constructor(game: Game, id: string) {
    this.game = game;
    this.ctx = game.renderer.ctx;
    this.canvas = game.renderer.canvas;
    this.active = false;

    this.id = id;
    this.scale = vec2(1, 1);
    this.orientation = 0;
    this.pt = 0;
    this._position = vec3(0, 0, 0);
    this._velocity = vec3(1, 0, 0);
    this.cachedPosition = {};

    this.initBuffers();

    window.requestAnimationFrame(() => {
      this.initialize();
    });

    this.canvas.addEventListener("tick", (event: TickEvent) => {
      this.onNextTick(event);
    });

    game.entities.push(this);
  }

  public setActive(active: boolean): void {
    this.active = active;
  }

  protected getObstacleRectangle(): Rectangle | undefined {
    return undefined;
  }

  protected initialize(): void {
    const obstacleRect = this.getObstacleRectangle();
    if (obstacleRect !== undefined) {
      this.obstacle = new Obstacle(this.game.collider, this.game.obstacles, this.id, obstacleRect);
    }

    this.move(0);
  }

  /**
   * Position in spacetime at the moment of intersecting the player's backward
   * light cone
   */
  get position(): Vec3 {
    return this._position;
  }
  set position(_position: Vec3) {
    this._position = _position;
    this.cachedPosition = {};
  }

  /**
   * Three-velocity (https://en.wikipedia.org/wiki/Four-velocity) at the moment
   * of intersecting the player's backward light cone
   */
  get velocity(): Vec3 {
    return this._velocity;
  }
  set velocity(_velocity: Vec3) {
    this._velocity = _velocity;
    // positions are light cone intersections and can change with velocity as well
    this.cachedPosition = {};
  }

  get visualPosition(): Vec3 {
    if (this.cachedPosition.visual !== undefined) return this.cachedPosition.visual;
    const p = lightConeIntersection(this.position, this.velocity, this.game.player.position);
    this.cachedPosition.visual = p;
    return p;
  }
  get nowPosition(): Vec3 {
    if (this.cachedPosition.now !== undefined) return this.cachedPosition.now;
    const p = nowIntersection(this.position, this.velocity, this.game.player.position, this.game.player.velocity);
    this.cachedPosition.now = p;
    return p;
  }
  get futurePosition(): Vec3 {
    if (this.cachedPosition.future !== undefined) return this.cachedPosition.future;
    const p = lightConeIntersection(this.position, this.velocity, this.game.player.position, "future");
    this.cachedPosition.future = p;
    return p;
  }
  get viewPosition(): Vec3 {
    if (this.cachedPosition.view !== undefined) return this.cachedPosition.view;
    const { cameraMode, position: playerPos, velocity: playerVel } = this.game.player;
    const absPosition = cameraMode === "visual"
        ? this.visualPosition
        : cameraMode === "now"
        ? this.nowPosition
        : this.futurePosition;  // use properties to take advantage of caching
    const p = absPosition.minus(playerPos).boost(playerVel.inv());
    this.cachedPosition.view = p;
    return p;
  }

  protected move(dt: number): void {
    const { position: oldPosition, velocity } = this;
    const { player } = this.game;
    this.position = lightConeIntersection(oldPosition, velocity, player.position);
    this.pt += (this.position.t - oldPosition.t) / velocity.t;

    if (this.obstacle !== undefined) {
      const newObstacleRect = this.getObstacleRectangle();
      if (newObstacleRect !== undefined) {
        this.obstacle?.editObstacle(newObstacleRect);
      }
    }
  }

  private initBuffers() {
    const gl = this.ctx;

    const positionBuffer = gl.createBuffer();
    if (positionBuffer === null) throw "Unable to create position buffer";
    const colorBuffer = gl.createBuffer();
    if (colorBuffer === null) throw "Unable to create color buffer";
    this.positionBuffer = positionBuffer;
    this.colorBuffer = colorBuffer;

    const positions = [
      1, 0,    0, .5,   0, -.5,
      0, .5,   -1, 1,   -1, 0,
      0, -.5,  -1, 0,   -1, -1,
      -.5, 0,  0, .5,   -1, 0,
      -.5, 0,  -1, 0,   0, -.5,
      -.5, 0,  0, -.5,  0, .5,
    ];
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    const colors = [
      0, 0, 1,  1, 0, 1,  0, 1, 1,
      1, 0, 1,  1, 0, 0,  1, 1, 0,
      0, 1, 1,  1, 1, 0,  0, 1, 0,
      1, 1, 1,  1, 0, 1,  1, 1, 0,
      1, 1, 1,  1, 1, 0,  0, 1, 1,
      1, 1, 1,  0, 1, 1,  1, 0, 1,
    ];
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  }

  private onNextTick(event: TickEvent): void {
    if (event.detail !== undefined) {
      this.tick(event.detail);
      this.drawReal();
    }
  }

  private createBoostMatrix(reference: Vec3) {
    const { x: rx, y: ry, t: rt } = reference;
    const boostFactor = C_INV_SQ / (rt + 1);
    const boostMatrix = mat4.fromValues(
      1 + rx * rx * boostFactor, rx * ry * boostFactor, rx * C_INV_SQ, 0,
      rx * ry * boostFactor, 1 + ry * ry * boostFactor, ry * C_INV_SQ, 0,
      rx, ry, rt, 0,
      0, 0, 0, 1
    );
    return boostMatrix;
  }

  protected draw(): void { }

  private drawReal(): void {
    const gl = this.ctx;
    const renderer = this.game.renderer;

    const {
      cameraMode,
      position: { x: cx, y: cy, t: ct },
    } = this.game.player;
    const { x, y, t } = this.visualPosition;
    const { x: vx2, y: vy2 } = this.velocity.vel2();
    const { x: sx, y: sy } = this.scale;
    const { width: w, height: h } = this.canvas;

    const { program, uniforms, attribs } = renderer.lightCone;
    gl.useProgram(program);

    gl.uniform1f(uniforms.cInvSq, C_INV_SQ);
    gl.uniform1f(uniforms.sign, cameraMode === "future" ? 1 : -1);  // TODO: now camera mode
    gl.uniform2fv(uniforms.entityVelocity2, [vx2, vy2]);

    // Convert unscaled entity-relative coordinates to camera-relative coordinates:
    //   vertexTransform = translate * boost * rotate * scale
    const vertexTransform = mat4.create();
    mat4.fromTranslation(vertexTransform, [x - cx, y - cy, t - ct]);
    // We need to boost vertex offsets for objects that are moving relative to
    // world coordinates because their length scale is assumed to be correct in
    // the reference frame in which the object is stationary.
    mat4.multiply(
      vertexTransform,
      vertexTransform,
      this.createBoostMatrix(this.velocity),
    );
    mat4.rotate(vertexTransform, vertexTransform, this.orientation, [0, 0, 1]);
    mat4.scale(vertexTransform, vertexTransform, [sx, sy, 1]);
    gl.uniformMatrix4fv(uniforms.vertexTransform, false, vertexTransform);

    // Implement the camera (read these transformations in reverse order for
    // more intuitive interpretation):
    const viewScreenTransform = mat4.create();
    // Transform world coordinates to normalized device coordinates [-1, 1]^3
    mat4.ortho(viewScreenTransform, -w/2, w/2, -h/2, h/2, -1, 1);
    // Force the z coordinate to be equal to the object's configured z-depth
    const depth = 0;  // TODO: z-ordering of objects
    mat4.translate(viewScreenTransform, viewScreenTransform, [0, 0, depth]);
    mat4.scale(viewScreenTransform, viewScreenTransform, [1, 1, 0]);
    // Adjust for the relativistic effects of the player's velocity by boosting
    // to a frame in which the player is stationary
    mat4.multiply(
      viewScreenTransform,
      viewScreenTransform,
      this.createBoostMatrix(this.game.player.velocity.inv()),
    );
    gl.uniformMatrix4fv(uniforms.viewScreenTransform, false, viewScreenTransform);

    renderer.lightCone.attrib({key: "vertexOffset", buffer: this.positionBuffer, numComponents: 2});
    renderer.lightCone.attrib({key: "vertexColor", buffer: this.colorBuffer, numComponents: 3});

    const vertexCount = 18;
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  }

  protected tick(tick: Tick): void {
    if (this.active) {
      this.move(tick.dt);
    }
  }
}
