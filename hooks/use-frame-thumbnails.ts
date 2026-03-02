"use client";

import { useMemo } from "react";
import type { GifFrame } from "@/core/domain/gif-types";

const MAX_THUMBNAILS = 48;
const THUMB_HEIGHT = 28;

/**
 * Returns a list of { frameIndex, dataUrl } for evenly sampled frames, for timeline scrubber.
 */
export function useFrameThumbnails(frames: GifFrame[]): Array<{ frameIndex: number; dataUrl: string }> {
  return useMemo(() => {
    if (typeof document === "undefined" || frames.length === 0) return [];

    const count = Math.min(frames.length, MAX_THUMBNAILS);
    const step = frames.length <= count ? 1 : (frames.length - 1) / (count - 1);
    const indices: number[] = [];
    for (let i = 0; i < count; i++) {
      indices.push(Math.min(Math.round(i * step), frames.length - 1));
    }

    const result: Array<{ frameIndex: number; dataUrl: string }> = [];
    const canvas = document.createElement("canvas");

    for (const idx of indices) {
      const frame = frames[idx];
      if (!frame?.imageData) continue;
      const iw = frame.imageData.width;
      const ih = frame.imageData.height;
      const scale = THUMB_HEIGHT / Math.max(ih, 1);
      const tw = Math.round(iw * scale);
      const th = Math.round(ih * scale);
      if (tw <= 0 || th <= 0) continue;
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      const temp = document.createElement("canvas");
      temp.width = iw;
      temp.height = ih;
      const tctx = temp.getContext("2d");
      if (!tctx) continue;
      tctx.putImageData(frame.imageData, 0, 0);
      ctx.drawImage(temp, 0, 0, iw, ih, 0, 0, tw, th);
      try {
        const dataUrl = canvas.toDataURL("image/png");
        result.push({ frameIndex: idx, dataUrl });
      } catch {
        // skip if canvas tainted or quota
      }
    }

    return result;
  }, [frames]);
}
