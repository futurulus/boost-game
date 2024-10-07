import { Countdown } from "./countdown";
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
import { ReturnWall } from "./entities/returnWall";

export class Game {
  collider: Collider2d;
  obstacles: Obstacle[];
  player: Player;
  opponent: Opponent;
  entities: Entity[];
  gamepadAdapter: GamepadAdapter;
  countdown: Countdown;
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

    for (let x = -250; x <= 250; x += 100) {
      const topWall = new ReturnWall(this, 'topWall');
      topWall.position = vec3(0, x, 800);
      topWall.scale = vec2(100, 5);
    }

    for (let x = -600; x <= 600; x += 400) {
      for (let y = -600; y <= 600; y += 400) {
        const timer = new Timer(this, `t_${x}_${y}`);
        timer.position = vec3(0, x, y);
      }
    }

    this.gamepadAdapter = new GamepadAdapter(canvas);

    this.countdown = new Countdown(this.renderer);
    this.gui = new Gui(this, 2);

    this.renderer.start();

    this.manageState();
    this.start();
  }

  manageState() {
    const { canvas } = this.renderer;

    canvas.addEventListener("countdown", ((e: FinishEvent) => {
      if (typeof e.detail?.winner === "number") {
        this.gui.incrementScore(e.detail.winner);
      }

      this.startCountdown(e.detail?.winner);
      this.togglePlayers(false);
    }) as EventListener);

    canvas.addEventListener("play", () => {
      this.togglePlayers(true);
    });
  }

  startCountdown(winner?: number) {
    this.countdown.startTimer(winner);
  }

  togglePlayers(active: boolean) {
    this.player.setActive(active);
    this.entities.forEach((entity) => {
      entity.setActive(active);
    });
  }

  start() {
    const startEvent: FinishEvent = new Event("countdown");
    this.renderer.canvas.dispatchEvent(startEvent);
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
