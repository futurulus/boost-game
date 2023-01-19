export type Vec2 = {
  x: number;
  y: number;
};

export type Vec3 = {
  x: number;
  y: number;
  t: number;
};

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

export interface TickEvent extends Event {
  readonly detail?: {
    frameCount: number;
    frameSkip: number;
  };
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
