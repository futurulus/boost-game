export class Vec2 {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  plus(other: Vec2): Vec2 { return new Vec2(this.x + other.x, this.y + other.y); }
  minus(other: Vec2): Vec2 { return new Vec2(this.x - other.x, this.y - other.y); }
  dot(other: Vec2): number { return this.x * other.x + this.y * other.y; }
  times(scale: number): Vec2 { return new Vec2(this.x * scale, this.y * scale); }

  /**
   * @returns Relativistic velocity sum: the overall measured velocity of an
   * object with velocity equal to this vector in the local frame of reference,
   * seen from a global frame of reference in which the local frame of reference
   * is moving with velocity `reference`. Vec2 objects are interpreted as
   * coordinate velocity, Vec3 as three-velocity (in all cases in units where c
   * = 1).
   *
   * Caution: relativistic velocity addition is **neither commutative nor
   * associative**. Both order and grouping matter; in general, `v2.boost(v1)`
   * will have the same magnitude as `v1.boost(v2)` but be rotated by some
   * angle.
   */
  boost(reference: Vec2 | Vec3): Vec2 {
    if (reference instanceof Vec3) reference = reference.vel2();

    // https://scipp.ucsc.edu/~haber/ph171/uvector15.pdf
    const dot = this.dot(reference);
    const speedFactor = 1 / (1 + dot);
    const gamma = reference.gamma();
    const thisScale = 1 / gamma;
    const referenceScale = (
      gamma === 1  // guard against div/0; reference.mag() <~ 7e-9
      ? 1
      : 1 + (gamma - 1) * dot * thisScale / reference.magSq()
    );

    return (
      this.times(thisScale).plus(reference.times(referenceScale))
    ).times(speedFactor);
  }

  neg(): Vec2 { return new Vec2(-this.x, -this.y); }
  magSq(): number { return this.x * this.x + this.y * this.y; }
  mag(): number { return Math.sqrt(this.magSq()); }
  /** @returns The Lorentz factor for this velocity https://en.wikipedia.org/wiki/Lorentz_factor */
  gamma(): number { return 1 / Math.sqrt(1 - this.magSq()); }

  /**
   * @returns the three-vector (https://en.wikipedia.org/wiki/Four-vector)
   * equivalent of this vector interpreted as velocity in units where c = 1
   */
  vel3(): Vec3 {
    const gamma = this.gamma();
    return new Vec3(gamma, gamma * this.x, gamma * this.y);
  }

  /**
   * @returns the three-velocity with the same x and y components as this vector
   * (inferring the correct t component)
   */
  spaceToVel3(): Vec3 { return new Vec3(Math.sqrt(this.magSq() + 1), this.x, this.y); }
};

/**
 * Represents a three-vector (https://en.wikipedia.org/wiki/Four-vector) in 2+1 Minkowski spacetime
 */
export class Vec3 {
  x: number;
  y: number;
  t: number;

  constructor(t: number, x: number, y: number) {
    this.t = t;
    this.x = x;
    this.y = y;
  }

  plus(other: Vec3): Vec3 {
    return new Vec3(this.t + other.t, this.x + other.x, this.y + other.y);
  }
  minus(other: Vec3): Vec3 {
    return new Vec3(this.t - other.t, this.x - other.x, this.y - other.y);
  }
  /**
   * @returns The three-vector inner product of two vectors. Uses metric
   * signature (+--), so (perhaps counterintuitively) similar spacelike vectors
   * have a *negative* dot product.
   */
  dot(other: Vec3): number {
    return this.t * other.t - this.x * other.x - this.y * other.y;
  }
  times(scale: number): Vec3 { return new Vec3(this.t * scale, this.x * scale, this.y * scale); }

  /**
   * @returns Active Lorentz boost: transforms this three-vector from the local
   * frame of reference to a global frame of reference in which the local frame
   * of reference is moving with velocity `reference`. A Vec2 object for
   * `reference` is interpreted as coordinate velocity, Vec3 as three-velocity
   * (in all cases in units where c = 1).
   *
   * Since three-velocities are three-vectors, this can also be used as a
   * relativistic velocity sum, like the method of the same name on Vec2: the
   * overall measured (three-)velocity of an object with this velocity in the
   * local frame has a three-velocity of this.boost(reference) in the global
   * frame.
   *
   * Caution: relativistic velocity addition is **neither commutative nor
   * associative**. Both order and grouping matter; in general, `v2.boost(v1)`
   * will have the same velocity magnitude as `v1.boost(v2)` but be spatially
   * rotated by some angle.
   */
  boost(reference: Vec2 | Vec3): Vec3 {
    if (reference instanceof Vec2) reference = reference.vel3();

    // https://physics.stackexchange.com/a/470031 eq (02)
    //   X = this = (t, x)
    //   U = reference = (g, -gu)  negative because this is an inverse/active transform
    //   X' = this.boost(reference) = (t', x')
    //   [natural units: c = 1]
    const [thisSpace, referenceSpace] = [this.space(), reference.space()];
    //   x' = x + g²/(g+1) (u·x) u - gt u
    //      = x + [(-gu·x)/(g+1) + t] (-gu)
    const spatialDot = referenceSpace.dot(thisSpace);
    const referenceScale = spatialDot / (reference.t + 1) + this.t;
    const { x, y } = thisSpace.plus(referenceSpace.times(referenceScale));
    //   t' = g(t - u·x) = gt + -gu·x
    return new Vec3(this.t * reference.t + spatialDot, x, y);
  }

  /**
   * @returns This vector with the spatial part negated (equivalent to raising/
   * lowering indices, or the "negation" of a three-velocity).
   */
  inv(): Vec3 { return new Vec3(this.t, -this.x, -this.y); }
  /**
   * @returns The spacetime interval associated with this three-vector. Positive
   * if timelike, negative if spacelike.
   */
  interval(): number { return this.t * this.t - this.x * this.x - this.y * this.y; }
  /**
   * @returns The two-vector coordinate velocity associated with this three-vector
   * interpreted as a three-velocity, in units where c = 1.
   */
  vel2(): Vec2 { return new Vec2(this.x / this.t, this.y / this.t); }
  /** @returns The spatial part of this vector (x, y), as a Vec2 */
  space(): Vec2 { return new Vec2(this.x, this.y); }
};

/** Shortcut constructor function (without `new`) */
export const vec2 = (x: number, y: number) => new Vec2(x, y);
/** Shortcut constructor function (without `new`) */
export const vec3 = (t: number, x: number, y: number) => new Vec3(t, x, y);

export type Dimensions = {
  width: number;
  height: number;
};

export type Rectangle = {
  a: Vec2;
  b: Vec2;
  c: Vec2;
  d: Vec2;
};

export interface Tick {
  dt: number;
}

export interface TickEvent extends Event {
  readonly detail?: Tick;
}

export interface FinishEvent extends Event {
  readonly detail?: {
    winner: number;
  };
}

export interface GamepadButtonEvent extends Event {
  readonly detail?: {
    gamepadId: number;
    buttonIndex: number;
    button: GamepadButton;
  };
}

export interface GamepadStickEvent extends Event {
  readonly detail?: {
    gamepadId: number;
    stickIndex: number;
    stick: Vec2;
  };
}

export interface LoadingEvent extends Event {
  readonly detail: {
    progress: number;
  };
}

export type Sprite = {
  name: string;
  images: string[];
  animationSpeed: number; // use next image every N frames, max 60
  offset: Vec2;
};

export type SpriteSet = {
  n: Sprite; // sprite facing north
  ne: Sprite; // sprite facing north-east
  e: Sprite; // etc
  se: Sprite;
  s: Sprite;
  sw: Sprite;
  w: Sprite;
  nw: Sprite;
};

export type ThemeConfig = {
  name: string; // has to match folder name
  scene: Sprite; // scene image, 1920x1080
  colors: string[];
  obstacles: Rectangle[]; // outline obsacles within the scene
  players: {
    default: SpriteSet; // player when standing still, 100x100
    move: SpriteSet; // player when moving, 100x100
    attack: SpriteSet; // player when attacking, 250x100
    block: SpriteSet; // player when blocking, 100x100
  }[]; // provide sprites for each player, else player 1 sprites will be re-used
  turnSprites?: boolean;
  shader?: (CanvasRenderingContext2D) => void;
  bgAudio: string; // link to background music audio
  attackAudio: string; // link to attack audio
  blockAudio: string; // link to block audio
  collideAudio: string; // lnk to collision audio
  winAudio: string; // link to win audio
};

export interface BeforeInstallPromptEvent extends Event {
  /**
   * Returns an array of DOMString items containing the platforms on which the event was dispatched.
   * This is provided for user agents that want to present a choice of versions to the user such as,
   * for example, "web" or "play" which would allow the user to chose between a web version or
   * an Android version.
   */
  readonly platforms: Array<string>;

  /**
   * Returns a Promise that resolves to a DOMString containing either "accepted" or "dismissed".
   */
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;

  /**
   * Allows a developer to show the install prompt at a time of their own choosing.
   * This method returns a Promise.
   */
  prompt(): Promise<void>;
}

export interface Window {
  webkitAudioContext: typeof AudioContext;
}

export type SoundLibrary = {
  [key: string]: {
    playing: boolean;
  };
};
