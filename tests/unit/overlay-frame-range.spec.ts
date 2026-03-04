import { describe, expect, it } from "vitest";
import {
  clampOverlayFrameRange,
  getOverlayFrameRange,
  isFrameWithinOverlayRange,
  shiftOverlayFrameRange,
} from "@/core/domain/project";

describe("overlay frame range helpers", () => {
  it("clamps and normalizes range bounds", () => {
    expect(clampOverlayFrameRange(-5, 200, 12)).toEqual({ inFrame: 0, outFrame: 11 });
    expect(clampOverlayFrameRange(8, 3, 12)).toEqual({ inFrame: 8, outFrame: 8 });
  });

  it("uses full timeline defaults when range is undefined", () => {
    const range = getOverlayFrameRange({}, 9);
    expect(range).toEqual({ inFrame: 0, outFrame: 8 });
  });

  it("shifts the range while preserving span near timeline edges", () => {
    expect(shiftOverlayFrameRange({ inFrame: 2, outFrame: 5 }, -4, 10)).toEqual({
      inFrame: 0,
      outFrame: 3,
    });
    expect(shiftOverlayFrameRange({ inFrame: 6, outFrame: 9 }, 3, 10)).toEqual({
      inFrame: 6,
      outFrame: 9,
    });
  });

  it("checks whether frame indices are inside the overlay range", () => {
    const overlay = { inFrame: 3, outFrame: 6 };
    expect(isFrameWithinOverlayRange(overlay, 2, 10)).toBe(false);
    expect(isFrameWithinOverlayRange(overlay, 3, 10)).toBe(true);
    expect(isFrameWithinOverlayRange(overlay, 6, 10)).toBe(true);
    expect(isFrameWithinOverlayRange(overlay, 7, 10)).toBe(false);
  });
});
