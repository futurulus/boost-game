import { Countdown } from "./countdown";
import { Obstacle } from "./obstacle";
import { Player } from "./player";
import { Renderer } from "./render";
import { Collider2d } from "collider2d";
import { Gui } from "./gui";
import { GamepadAdapter } from "./gamepadAdapter";
import { registerServiceWorker } from "./registerServiceWorker";
import { showInstallButton } from "./showInstallButton";
import { FinishEvent, LoadingEvent } from "./types";
import { Entity } from "./entity";
import { Opponent } from "./entities/opponent";
import { Timer } from "./entities/timer";

export class Game {
  ctx: CanvasRenderingContext2D;
  collider: Collider2d;
  obstacles: Obstacle[];
  player: Player;
  entities: Entity[];
  gamepadAdapter: GamepadAdapter;
  countdown: Countdown;
  gui: Gui;
  renderer: Renderer;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (ctx === null) throw new Error("Can't get context from canvas!");

    this.ctx = ctx;
    this.ctx.canvas.classList.add("fade-in");
    this.collider = new Collider2d();
    this.obstacles = [];
    this.entities = [];

    this.player = new Player(this);
    const player2 = new Opponent(this, 'player2');
    this.entities.push(player2);
    for (let x = -600; x <= 600; x += 400) {
      for (let y = -600; y <= 600; y += 400) {
        const timer = new Timer(this, `t_${x}_${y}`);
        timer.position = { x, y };
        this.entities.push(timer);
      }
    }

    this.gamepadAdapter = new GamepadAdapter(this.ctx);

    this.countdown = new Countdown(this.ctx);
    this.gui = new Gui(this.ctx, 2);

    this.renderer = new Renderer(this.ctx);

    this.manageState();
    this.start();
  }

  manageState() {
    this.ctx.canvas.addEventListener("countdown", ((e: FinishEvent) => {
      if (typeof e.detail?.winner === "number") {
        this.gui.incrementScore(e.detail.winner);
      }

      this.startCountdown(e.detail?.winner);
      this.togglePlayers(false);
    }) as EventListener);

    this.ctx.canvas.addEventListener("play", () => {
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
    this.ctx.canvas.dispatchEvent(startEvent);
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
