export type GamepadButtonKey =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'a'
  | 'b'
  | 'x'
  | 'y'
  | 'select'
  | 'start'
  | 'l'
  | 'r';

export interface ControllerState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  a: boolean;
  b: boolean;
  x: boolean;
  y: boolean;
  select: boolean;
  start: boolean;
  l: boolean;
  r: boolean;
}

export type StateChangeListener = (state: ControllerState) => void;

export class VirtualGamepadController {
  private state: ControllerState = {
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
    x: false,
    y: false,
    select: false,
    start: false,
    l: false,
    r: false
  };

  private listeners: Set<StateChangeListener> = new Set();

  getState(): ControllerState {
    return { ...this.state };
  }

  onStateChange(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  pressButton(key: GamepadButtonKey) {
    if (!this.state[key]) {
      this.state[key] = true;
      this.notifyListeners();
    }
  }

  releaseButton(key: GamepadButtonKey) {
    if (this.state[key]) {
      this.state[key] = false;
      this.notifyListeners();
    }
  }

  updateFromGamepadApi(buttons: readonly GamepadButton[]) {
    // Standard Gamepad API Mapping:
    // 0: Bottom action button (B on Nintendo, A on Xbox)
    // 1: Right action button (A on Nintendo, B on Xbox)
    // 2: Left action button (Y on Nintendo, X on Xbox)
    // 3: Top action button (X on Nintendo, Y on Xbox)
    // 4: L Shoulder
    // 5: R Shoulder
    // 8: Select / Back
    // 9: Start
    // 12: D-Pad Up
    // 13: D-Pad Down
    // 14: D-Pad Left
    // 15: D-Pad Right

    const newState: ControllerState = {
      b: Boolean(buttons[0]?.pressed),
      a: Boolean(buttons[1]?.pressed),
      y: Boolean(buttons[2]?.pressed),
      x: Boolean(buttons[3]?.pressed),
      l: Boolean(buttons[4]?.pressed),
      r: Boolean(buttons[5]?.pressed),
      select: Boolean(buttons[8]?.pressed),
      start: Boolean(buttons[9]?.pressed),
      up: Boolean(buttons[12]?.pressed),
      down: Boolean(buttons[13]?.pressed),
      left: Boolean(buttons[14]?.pressed),
      right: Boolean(buttons[15]?.pressed)
    };

    let changed = false;
    for (const key of Object.keys(newState) as GamepadButtonKey[]) {
      if (this.state[key] !== newState[key]) {
        changed = true;
        this.state[key] = newState[key];
      }
    }

    if (changed) {
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
