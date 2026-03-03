import { describe, expect, it } from "vitest";
import {
  addKeyframe,
  bakeEffectToKeyframes,
  clearEffect,
  createTextOverlay,
} from "@/core/application/commands/overlay-commands";

describe("overlay-commands math", () => {
  it("interpolates a new keyframe between two existing keyframes", () => {
    const overlay = createTextOverlay(11);
    const withInterpolation = addKeyframe(
      {
        ...overlay,
        keyframes: [
          { frameIndex: 0, x: 0.1, y: 0.2, scale: 1, rotation: 0, opacity: 0.5 },
          { frameIndex: 10, x: 0.9, y: 0.8, scale: 2, rotation: 90, opacity: 1 },
        ],
      },
      5
    );

    const mid = withInterpolation.keyframes.find((kf) => kf.frameIndex === 5);
    expect(mid).toBeDefined();
    expect(mid?.x).toBeCloseTo(0.5, 5);
    expect(mid?.y).toBeCloseTo(0.5, 5);
    expect(mid?.scale).toBeCloseTo(1.5, 5);
    expect(mid?.rotation).toBeCloseTo(45, 5);
    expect(mid?.opacity).toBeCloseTo(0.75, 5);
  });

  it("returns the same overlay when adding an existing keyframe", () => {
    const overlay = createTextOverlay(6);
    const same = addKeyframe(overlay, 0);
    expect(same).toBe(overlay);
  });

  it("bakes fade-in effect with monotonic opacity across the frame range", () => {
    const overlay = createTextOverlay(8);
    const baked = bakeEffectToKeyframes(overlay, "fade-in", 0, 7, "linear");

    const first = baked.keyframes.find((kf) => kf.frameIndex === 0);
    const middle = baked.keyframes.find((kf) => kf.frameIndex === 3);
    const last = baked.keyframes.find((kf) => kf.frameIndex === 7);

    expect(first?.opacity).toBeCloseTo(0, 5);
    expect(middle?.opacity ?? 0).toBeGreaterThan(first?.opacity ?? 0);
    expect(last?.opacity).toBeCloseTo(1, 5);
  });

  it("keeps non-effect properties stable for shake while moving x", () => {
    const overlay = createTextOverlay(12);
    const baked = bakeEffectToKeyframes(overlay, "shake", 0, 11, "linear");

    const affected = baked.keyframes.filter((kf) => kf.frameIndex >= 0 && kf.frameIndex <= 11);
    expect(affected.length).toBeGreaterThan(0);
    expect(affected.some((kf) => Math.abs(kf.x - 0.5) > 0.0001)).toBe(true);
    expect(affected.every((kf) => kf.scale === 1)).toBe(true);
    expect(affected.every((kf) => kf.opacity === 1)).toBe(true);
  });

  it("clears effects and resets to first/last positional keyframes", () => {
    const overlay = createTextOverlay(20);
    const baked = bakeEffectToKeyframes(overlay, "slide-up", 2, 18);
    const cleared = clearEffect(baked, 20);

    expect(cleared.effects).toEqual([]);
    expect(cleared.keyframes).toHaveLength(2);
    expect(cleared.keyframes[0].frameIndex).toBe(0);
    expect(cleared.keyframes[1].frameIndex).toBe(19);
    expect(cleared.keyframes[0].x).toBeCloseTo(baked.keyframes[0].x, 5);
    expect(cleared.keyframes[1].y).toBeCloseTo(
      baked.keyframes[baked.keyframes.length - 1].y,
      5
    );
  });
});
