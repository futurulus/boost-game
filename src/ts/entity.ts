import { lightConeIntersection, nowIntersection } from "./geometry";
import { C, Game } from "./main";
import { Obstacle } from "./obstacle";
import { Rectangle, Tick, TickEvent, vec2, Vec2, vec3, Vec3 } from "./types";

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
  protected active: boolean;

  protected positionBuffer: WebGLBuffer;

  constructor(game: Game, id: string) {
    this.game = game;
    this.ctx = game.ctx;
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

    this.ctx.canvas.addEventListener("tick", (event: TickEvent) => {
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
    const positions = [.01, .01, -.01, .01, .01, -.01, -.01, -.01];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return positionBuffer;
  }

  private onNextTick(event: TickEvent): void {
    const gl = this.ctx;
    const renderer = this.game.renderer;

    this.setPositionAttribute();

    gl.useProgram(renderer.shader);

    const { x, y } = this.position;
    gl.uniformMatrix4fv(
      renderer.uniforms.modelViewMatrix,
      false,
      [1, 0, 0, 0,
       0, 1, 0, 0,
       0, 0, 1, 0,
       x, y, 0, 1],
    );

    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);

    if (event.detail !== undefined) {
      this.tick(event.detail);
      this.draw();
    }
  }

  private setPositionAttribute() {
    const gl = this.ctx;
    const { renderer } = this.game;

    const numComponents = 2; // pull out 2 values per iteration
    const type = gl.FLOAT; // the data in the buffer is 32bit floats
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0; // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(
      renderer.attribs.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset,
    );
    gl.enableVertexAttribArray(renderer.attribs.vertexPosition);
  }

  /** Execute `draw` with the context transformed into entity-relative coordinates */
  protected drawLocal(draw: () => void): void {
    /*
    this.ctx.save();

    // Screen-center coordinates
    const { width, height } = this.ctx.canvas;
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
