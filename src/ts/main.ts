import { Obstacle } from "./obstacle";
import { Player } from "./player";
import { Renderer } from "./render";
import { Collider2d } from "collider2d";
import { Gui } from "./gui";
import { GamepadAdapter } from "./gamepadAdapter";
import { registerServiceWorker } from "./registerServiceWorker";
import { showInstallButton } from "./showInstallButton";
import { FinishEvent, vec2, vec3 } from "./types";
import { Entity } from "./entity";
import { Opponent } from "./entities/opponent";
import { Timer } from "./entities/timer";
import { ReturnWall, ReflectWall } from "./entities/wall";

export class Game {
  collider: Collider2d;
  obstacles: Obstacle[];
  player: Player;
  opponent: Opponent;
  entities: Entity[];
  gamepadAdapter: GamepadAdapter;
  gui: Gui;
  renderer: Renderer;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("webgl2", { alpha: false });
    if (ctx === null) throw new Error("Can't get context from canvas!");

    this.renderer = new Renderer(ctx, canvas);

    canvas.classList.add("fade-in");
    this.collider = new Collider2d();
    this.obstacles = [];
    this.entities = [];

    this.player = new Player(this);
    this.opponent = new Opponent(this, 'player2');

    const topWall = new ReturnWall(this, 'topWall');
    topWall.position = vec3(0, 0, 800);
    topWall.scale = vec2(600, 5);

    const bottomWall = new ReflectWall(this, 'bottomWall');
    bottomWall.position = vec3(0, 0, -800);
    bottomWall.scale = vec2(600, 5);

    for (let x = -600; x <= 600; x += 400) {
      for (let y = -600; y <= 600; y += 400) {
        const timer = new Timer(this, `t_${x}_${y}`);
        timer.position = vec3(0, x, y);
      }
    }

    this.gamepadAdapter = new GamepadAdapter(canvas);

    this.gui = new Gui(this, 2);

    this.renderer.start();

    this.manageState();
  }

  manageState() {
    const { canvas } = this.renderer;

    canvas.addEventListener("pause", ((e: FinishEvent) => {
      if (typeof e.detail?.winner === "number") {
        this.gui.incrementScore(e.detail.winner);
      }

      this.toggleActive(false);
      this.reset();
    }) as EventListener);

    canvas.addEventListener("play", () => {
      this.toggleActive(true);
    });
  }

  toggleActive(active: boolean) {
    this.entities.forEach((entity) => {
      entity.setActive(active);
    });
  }

  reset() {
    this.entities.forEach((entity) => {
      entity.reset();
    });
  }
}

function showClick() {
    const click = document.querySelector(".click");
    if (click === null) return;
    click.removeAttribute("hidden");

    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (canvas === null) return;

    const startGame = () => {
      click.setAttribute("hidden", "true");
      new Game(canvas);
      canvas.removeEventListener("click", startGame);
    }
    canvas.addEventListener("click", startGame);
}

showClick();

if (window.BroadcastChannel) {
  const channel = new BroadcastChannel("sw-messages");
  registerServiceWorker();
  showInstallButton(channel);
}

if (window.matchMedia("(display-mode: fullscreen)").matches) {
  document.querySelectorAll("[data-link='external']").forEach((el) => {
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener noreferrer");
  });
}
