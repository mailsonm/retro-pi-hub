// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { VirtualGamepadController, GamepadButtonKey } from '../src/services/virtual-gamepad.service.js';

describe('Seam: Virtual Gamepad & Controller Mapping (Ticket #08)', () => {
  it('should start with all buttons unpressed', () => {
    const pad = new VirtualGamepadController();
    const state = pad.getState();

    expect(state.a).toBe(false);
    expect(state.b).toBe(false);
    expect(state.up).toBe(false);
    expect(state.down).toBe(false);
    expect(state.start).toBe(false);
  });

  it('should update state and emit change when buttons are pressed and released', () => {
    const pad = new VirtualGamepadController();
    const listener = vi.fn();
    pad.onStateChange(listener);

    pad.pressButton('a');
    expect(pad.getState().a).toBe(true);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ a: true }));

    pad.releaseButton('a');
    expect(pad.getState().a).toBe(false);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ a: false }));
  });

  it('should handle simultaneous multi-touch button presses', () => {
    const pad = new VirtualGamepadController();

    pad.pressButton('right');
    pad.pressButton('b');
    pad.pressButton('y');

    const state = pad.getState();
    expect(state.right).toBe(true);
    expect(state.b).toBe(true);
    expect(state.y).toBe(true);
    expect(state.left).toBe(false);
  });

  it('should map standard Web Gamepad API buttons array to internal controller state', () => {
    const pad = new VirtualGamepadController();

    // Standard Gamepad mapping:
    // 0: A/B (bottom), 1: B/A (right), 12: D-pad Up, etc.
    const mockButtons = Array(16).fill(null).map(() => ({ pressed: false, value: 0 }));
    mockButtons[0] = { pressed: true, value: 1.0 }; // B/A
    mockButtons[12] = { pressed: true, value: 1.0 }; // D-pad Up

    pad.updateFromGamepadApi(mockButtons as unknown as GamepadButton[]);

    const state = pad.getState();
    expect(state.b).toBe(true);
    expect(state.up).toBe(true);
    expect(state.a).toBe(false);
    expect(state.down).toBe(false);
  });
});
