import { mat3, mat4 } from "gl-matrix";
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

    this.initPositionBuffer();

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

  private initPositionBuffer() {
    const gl = this.ctx;

    const positionBuffer = gl.createBuffer();
    if (positionBuffer === null) throw "Unable to create position buffer";
    this.positionBuffer = positionBuffer;

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [1, 0, -1, 1, -1, -1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  }

  private onNextTick(event: TickEvent): void {
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

    gl.useProgram(renderer.shader);

    gl.uniform1f(renderer.uniforms.cInvSq, C_INV_SQ);
    gl.uniform1f(renderer.uniforms.sign, cameraMode === "future" ? 1 : -1);  // TODO: now camera mode
    gl.uniform2fv(renderer.uniforms.entityVelocity2, [vx2, vy2]);

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
    gl.uniformMatrix4fv(renderer.uniforms.vertexTransform, false, vertexTransform);

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
    gl.uniformMatrix4fv(renderer.uniforms.viewScreenTransform, false, viewScreenTransform);

    renderer.attrib({key: "vertexOffset", buffer: this.positionBuffer, numComponents: 2});

    const vertexCount = 3;
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount);

    if (event.detail !== undefined) {
      this.tick(event.detail);
      this.draw();
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

  /** Execute `draw` with the context transformed into entity-relative coordinates */
  protected drawLocal(draw: () => void): void {
    /*
    this.ctx.save();

    // Screen-center coordinates
    const { width, height } = this.canvas;
    this.ctx.translate(width / 2, height / 2);
    // -y for right-hand coordinate system
    this.ctx.scale(C, -C);

    // Camera position
    const { position: playerPos, velocity: playerVel, cameraMode } = this.game.player;
    const viewPos = this.viewPosition;
    this.ctx.translate(viewPos.x, viewPos.y)

    // Relativistic distortion
    const intersection = (pos: Vec3): Vec3 => (
      cameraMode === "visual"
        ? lightConeIntersection(pos, this.velocity, playerPos)
        : cameraMode === "now"
        ? nowIntersection(pos, this.velocity, playerPos, playerVel)
        : lightConeIntersection(pos, this.velocity, playerPos, "future")
    );
    const xEps = intersection(this.position.plus(vec3(0, 1 / AXIS_SHRINK, 0).boost(this.velocity)));
    const yEps = intersection(this.position.plus(vec3(0, 0, 1 / AXIS_SHRINK).boost(this.velocity)));
    const invVel = playerVel.inv();
    const relScaleX = xEps.minus(playerPos).boost(invVel).minus(viewPos);
    const relScaleY = yEps.minus(playerPos).boost(invVel).minus(viewPos);
    this.ctx.transform(
      relScaleX.x * AXIS_SHRINK, relScaleX.y * AXIS_SHRINK,
      relScaleY.x * AXIS_SHRINK, relScaleY.y * AXIS_SHRINK,
      0, 0,
    );

    // Entity rotation and scaling
    this.ctx.rotate(this.orientation);
    this.ctx.scale(this.scale.x, this.scale.y);
    */

    draw();

    /*
    this.ctx.restore();
    */
  }

  protected draw(): void { }

  protected tick(tick: Tick): void {
    if (this.active) {
      this.move(tick.dt);
    }
  }
}
