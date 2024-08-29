import { Vec2, GamepadButtonEvent, GamepadStickEvent, vec2 } from "./types";

export class GamepadAdapter {
  canvas: HTMLCanvasElement;
  gamepads: ({
    buttons: {
      pressed: boolean;
      value: number;
    }[];
  } | null)[];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.gamepads = [null, null];
    this.saveGamepadsState();

    canvas.addEventListener("tick", () => {
      this.pollGamepads();
    });
  }

  saveGamepadsState() {
    navigator.getGamepads().forEach((gp, i) => {
      this.gamepads[i] = {
        buttons: gp?.buttons.map((b) => ({
          pressed: b.pressed,
          value: b.value,
        })) ?? [],
      };
    });
  }

  pollGamepads() {
    const gamepads = navigator.getGamepads();
    for (var i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp && gp.buttons && this.gamepads[i]?.buttons) {
        const axes = gp.axes;
        this.moveStick(i, 0, vec2(axes[0], axes[1]));
        this.moveStick(i, 1, vec2(axes[2], axes[3]));

        const buttons = gp.buttons.map((b, j) => ({
          index: j,
          button: b,
        }));
        if (buttons.length > 0) {
          buttons.forEach((b) => {
            if (
              this.gamepads[i]?.buttons &&
              b.button.value !==
                this.gamepads[i]?.buttons[b.index]?.value &&
              b.button.pressed
            ) {
              this.pressButton(i, b.index, b.button);
            } else if (
              this.gamepads[i]?.buttons &&
              b.button.value !==
                this.gamepads[i]?.buttons[b.index]?.value &&
              !b.button.pressed
            ) {
              this.releaseButton(i, b.index, b.button);
            }
          });
        }
      } else {
        this.saveGamepadsState();
      }
    }
  }

  pressButton(gamepad: number, buttonIndex: number, button: GamepadButton) {
    const gamepadState = this.gamepads[gamepad];
    if (gamepadState === null) return;

    gamepadState.buttons[buttonIndex].value = button.value;
    gamepadState.buttons[buttonIndex].pressed = button.pressed;
    const GamepadButtonDown: GamepadButtonEvent = new CustomEvent(
      "gamepadButtonDown",
      {
        detail: {
          gamepadId: gamepad,
          buttonIndex: buttonIndex,
          button: button,
        },
      }
    );
    document.dispatchEvent(GamepadButtonDown);
  }

  releaseButton(gamepad: number, buttonIndex: number, button: GamepadButton) {
    const gamepadState = this.gamepads[gamepad];
    if (gamepadState === null) return;

    gamepadState.buttons[buttonIndex].value = button.value;
    gamepadState.buttons[buttonIndex].pressed = button.pressed;
    const GamepadButtonUp: GamepadButtonEvent = new CustomEvent(
      "gamepadButtonUp",
      {
        detail: {
          gamepadId: gamepad,
          buttonIndex: buttonIndex,
          button: button,
        },
      }
    );
    document.dispatchEvent(GamepadButtonUp);
  }

  moveStick(gamepad: number, stickIndex: number, stick: Vec2) {
    // add deadzone to prevent drift
    const coords = vec2(
      Math.abs(stick.x) < 0.2 ? 0 : stick.x,
      Math.abs(stick.y) < 0.2 ? 0 : stick.y,
    );

    const GamepadStickMove: GamepadStickEvent = new CustomEvent(
      "gamepadStickMove",
      {
        detail: {
          gamepadId: gamepad,
          stickIndex: stickIndex,
          stick: coords,
        },
      }
    );

    document.dispatchEvent(GamepadStickMove);
  }
}
