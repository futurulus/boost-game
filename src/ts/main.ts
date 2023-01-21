import { Audio } from "./audio";
import { Countdown } from "./countdown";
import { Obstacle } from "./obstacle";
import { Character } from "./character";
import { Renderer } from "./render";
import { Collider2d } from "collider2d";
import { Gui } from "./gui";
import { GamepadAdapter } from "./gamepadAdapter";
import { themes } from "../../public/themes/index";
import { Theme } from "../../public/themes/theme";
import { registerServiceWorker } from "./registerServiceWorker";
import { showInstallButton } from "./showInstallButton";
import { FinishEvent, LoadingEvent } from "./types";

export class Game {
  ctx: CanvasRenderingContext2D;
  collider: Collider2d;
  obstacles: Obstacle[];
  players: Character[];
  gamepadAdapter: GamepadAdapter;
  countdown: Countdown;
  gui: Gui;
  theme: Theme;
  renderer: Renderer;
  audio: Audio;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (ctx === null) throw new Error("Can't get context from canvas!");

    this.ctx = ctx;
    this.showLoader();
    this.collider = new Collider2d();
    this.theme = new Theme(this.ctx, themes.RetroKnights);
    this.obstacles = [];
    this.players = [];
    this.audio = new Audio(this.theme);

    const player1 = new Character(this, 0, this.theme);
    const player2 = new Character(this, 1, this.theme);
    this.players.push(player1, player2);

    this.gamepadAdapter = new GamepadAdapter(this.ctx);

    this.countdown = new Countdown(this.ctx, this.theme);
    this.gui = new Gui(this.ctx, this.theme, 2);

    this.renderer = new Renderer(this.ctx, this.theme);

    this.manageState();
    this.start();
  }

  showLoader() {
    const loader = document.querySelector(".loader");
    if (loader === null) return;
    const progress = loader.querySelector("progress");
    if (progress === null) return;
    loader.removeAttribute("hidden");
    this.ctx.canvas.addEventListener("loadingEvent", ((e: LoadingEvent) => {
      progress.value = e.detail.progress;
      if (e.detail.progress === 100) {
        loader.setAttribute("hidden", "true");
        this.ctx.canvas.classList.add("fade-in");
      }
    }) as EventListener);
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
    this.players.forEach((player) => {
      player.setActive(active);
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
