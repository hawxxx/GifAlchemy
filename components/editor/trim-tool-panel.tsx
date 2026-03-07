"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/lib/utils";
import type { CropAspectPreset } from "@/core/domain/project";

const CROP_RATIO_PRESETS: Array<{ id: CropAspectPreset; label: string; ratio: number | null }> = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
];

function ratioForPreset(preset: CropAspectPreset | undefined): number | null {
  return CROP_RATIO_PRESETS.find((item) => item.id === (preset ?? "free"))?.ratio ?? null;
}

function clampCropToMetadata(
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
    aspectRatioPreset?: CropAspectPreset;
    rotation?: number;
    flipX?: boolean;
    flipY?: boolean;
  },
  metadata: { width: number; height: number },
  changedKeys: string[] = []
) {
  const ratio = ratioForPreset(crop.aspectRatioPreset);
  let nextWidth = Math.max(1, Math.round(crop.width));
  let nextHeight = Math.max(1, Math.round(crop.height));

  if (ratio) {
    if (changedKeys.includes("width") && !changedKeys.includes("height")) {
      nextHeight = Math.max(1, Math.round(nextWidth / ratio));
    } else if (changedKeys.includes("height") && !changedKeys.includes("width")) {
      nextWidth = Math.max(1, Math.round(nextHeight * ratio));
    } else {
      const hFromW = Math.max(1, Math.round(nextWidth / ratio));
      const wFromH = Math.max(1, Math.round(nextHeight * ratio));
      if (Math.abs(hFromW - nextHeight) <= Math.abs(wFromH - nextWidth)) nextHeight = hFromW;
      else nextWidth = wFromH;
    }
  }

  const maxX = Math.max(0, metadata.width - 1);
  const maxY = Math.max(0, metadata.height - 1);
  let x = Math.max(0, Math.min(maxX, Math.round(crop.x)));
  let y = Math.max(0, Math.min(maxY, Math.round(crop.y)));
  nextWidth = Math.max(1, Math.min(metadata.width - x, nextWidth));
  nextHeight = Math.max(1, Math.min(metadata.height - y, nextHeight));

  if (ratio) {
    const maxWidthByHeight = Math.max(1, Math.floor(nextHeight * ratio));
    const maxHeightByWidth = Math.max(1, Math.floor(nextWidth / ratio));
    if (maxWidthByHeight <= nextWidth) nextWidth = maxWidthByHeight;
    else nextHeight = maxHeightByWidth;
    nextWidth = Math.max(1, Math.min(metadata.width - x, nextWidth));
    nextHeight = Math.max(1, Math.min(metadata.height - y, nextHeight));
    if (x + nextWidth > metadata.width) x = Math.max(0, metadata.width - nextWidth);
    if (y + nextHeight > metadata.height) y = Math.max(0, metadata.height - nextHeight);
  }

  return {
    x,
    y,
    width: nextWidth,
    height: nextHeight,
    aspectRatioPreset: crop.aspectRatioPreset ?? "free",
    rotation: (((crop.rotation ?? 0) % 360) + 360) % 360,
    flipX: Boolean(crop.flipX),
    flipY: Boolean(crop.flipY),
  };
}

function findOpaqueBounds(imageData: ImageData): { x: number; y: number; width: number; height: number } | null {
  const { data, width, height } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha === 0) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export function TrimToolPanel() {
  const { state, dispatch } = useEditor();
  const frameCount = state.frames.length;
  const metadata = state.metadata;
  const trimStart = state.trimStart;
  const trimEnd = state.trimEnd;
  const trimmedCount = frameCount > 0 ? Math.max(0, trimEnd - trimStart + 1) : 0;
  const crop = state.outputSettings.crop;

  if (frameCount === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Load a GIF to set trim range.
      </p>
    );
  }

  const lastFrame = frameCount - 1;
  const setTrim = (start: number, end: number) => {
    const s = Math.max(0, Math.min(lastFrame, start));
    const e = Math.max(s, Math.min(lastFrame, end));
    dispatch({ type: "SET_TRIM", payload: { trimStart: s, trimEnd: e } });
  };

  const initCrop = () => {
    if (!metadata) return;
    dispatch({
      type: "UPDATE_OUTPUT_SETTINGS",
      payload: {
        width: metadata.width,
        height: metadata.height,
        crop: {
          x: 0,
          y: 0,
          width: metadata.width,
          height: metadata.height,
        },
      },
    });
  };

  const applyCrop = (nextCrop: NonNullable<typeof crop>, changedKeys: string[] = []) => {
    if (!metadata || !crop) return;
    const normalized = clampCropToMetadata(nextCrop, metadata, changedKeys);
    dispatch({
      type: "UPDATE_OUTPUT_SETTINGS",
      payload: {
        crop: normalized,
        width: normalized.width,
        height: normalized.height,
      },
    });
  };

  const updateCrop = (updates: Partial<NonNullable<typeof crop>>) => {
    if (!metadata || !crop) return;
    applyCrop({ ...crop, ...updates }, Object.keys(updates));
  };

  const setCropAspectPreset = (preset: CropAspectPreset) => {
    if (!metadata || !crop) return;
    applyCrop({ ...crop, aspectRatioPreset: preset }, ["aspectRatioPreset"]);
  };

  const rotateCrop = (delta: number) => {
    if (!metadata || !crop) return;
    applyCrop({ ...crop, rotation: (crop.rotation ?? 0) + delta }, ["rotation"]);
  };

  const resetCrop = () => {
    if (!metadata || !crop) return;
    applyCrop(
      {
        x: 0,
        y: 0,
        width: metadata.width,
        height: metadata.height,
        aspectRatioPreset: "free",
        rotation: 0,
        flipX: false,
        flipY: false,
      },
      ["x", "y", "width", "height", "aspectRatioPreset", "rotation", "flipX", "flipY"]
    );
  };

  const fitCropToContent = () => {
    if (!metadata || !crop) return;
    const frame = state.frames[state.currentFrameIndex];
    const bounds = frame ? findOpaqueBounds(frame.imageData) : null;
    if (!bounds) {
      resetCrop();
      return;
    }
    applyCrop({ ...crop, ...bounds }, ["x", "y", "width", "height"]);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground/80 leading-relaxed">
        Export only frames in this range. Playback still shows the full timeline.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">Start frame</Label>
          <Input
            type="number"
            min={0}
            max={lastFrame}
            value={trimStart}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) setTrim(v, trimEnd);
            }}
            className="h-8 rounded-lg bg-black/20 border-white/10 text-xs focus-visible:ring-1 focus-visible:ring-white/20"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">End frame</Label>
          <Input
            type="number"
            min={trimStart}
            max={lastFrame}
            value={trimEnd}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) setTrim(trimStart, v);
            }}
            className="h-8 rounded-lg bg-black/20 border-white/10 text-xs focus-visible:ring-1 focus-visible:ring-white/20"
          />
        </div>
      </div>
      <div className="rounded-xl border border-white/5 bg-black/10 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Range</Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            Frames {trimStart}–{trimEnd} ({trimmedCount} of {frameCount})
          </span>
        </div>
        <div className="space-y-2">
          <div>
            <span className="text-[10px] text-muted-foreground">Start</span>
            <Slider
              value={[trimStart]}
              min={0}
              max={lastFrame}
              step={1}
              onValueChange={([v]) => setTrim(v ?? 0, trimEnd)}
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">End</span>
            <Slider
              value={[trimEnd]}
              min={trimStart}
              max={lastFrame}
              step={1}
              onValueChange={([v]) => setTrim(trimStart, v ?? lastFrame)}
            />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => dispatch({ type: "SET_TRIM", payload: { trimStart: 0, trimEnd: lastFrame } })}
        className={cn(
          "w-full rounded-lg border border-white/10 bg-transparent py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground",
          trimStart === 0 && trimEnd === lastFrame && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
        )}
      >
        Reset to full timeline
      </button>

      <div className="border-t border-white/10 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Crop</Label>
          {!crop ? (
            <button
              type="button"
              onClick={initCrop}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Enable crop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => dispatch({ type: "UPDATE_OUTPUT_SETTINGS", payload: { crop: null } })}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Disable crop
            </button>
          )}
        </div>

        {crop && metadata && (
          <>
            <p className="text-[11px] text-muted-foreground">
              Drag crop box directly on the canvas, or fine-tune values below.
            </p>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">Aspect</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {CROP_RATIO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={cn(
                      "h-8 rounded-lg border text-[11px] font-medium transition-colors",
                      (crop.aspectRatioPreset ?? "free") === preset.id
                        ? "border-primary bg-primary/20 text-primary shadow-sm"
                        : "border-white/10 bg-black/20 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                    onClick={() => setCropAspectPreset(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                className="h-8 rounded-lg border border-white/10 bg-black/20 text-[11px] font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
                onClick={() => rotateCrop(-90)}
              >
                Rotate -90°
              </button>
              <button
                type="button"
                className="h-8 rounded-lg border border-white/10 bg-black/20 text-[11px] font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
                onClick={() => rotateCrop(90)}
              >
                Rotate +90°
              </button>
              <div className="h-8 rounded-lg border border-white/5 bg-white/5 text-[11px] font-medium text-foreground flex items-center justify-center tabular-nums">
                {(crop.rotation ?? 0)}°
              </div>

              <button
                type="button"
                className={cn(
                  "h-8 rounded-lg border text-[11px] font-medium transition-colors",
                  crop.flipX
                    ? "border-primary bg-primary/20 text-primary shadow-sm"
                    : "border-white/10 bg-black/20 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
                onClick={() => updateCrop({ flipX: !crop.flipX })}
              >
                Flip X
              </button>
              <button
                type="button"
                className={cn(
                  "h-8 rounded-lg border text-[11px] font-medium transition-colors",
                  crop.flipY
                    ? "border-primary bg-primary/20 text-primary shadow-sm"
                    : "border-white/10 bg-black/20 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
                onClick={() => updateCrop({ flipY: !crop.flipY })}
              >
                Flip Y
              </button>
              <button
                type="button"
                className="h-8 rounded-lg border border-white/10 bg-black/20 text-[11px] font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
                onClick={() => updateCrop({ rotation: 0, flipX: false, flipY: false })}
              >
                Reset xf
              </button>
            </div>
            
            <div className="rounded-xl border border-white/5 bg-black/10 p-3 mt-2 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">X Pos</Label>
                <Input
                  type="number"
                  min={0}
                  max={metadata.width - 1}
                  value={crop.x}
                  onChange={(e) => updateCrop({ x: Number(e.target.value) || 0 })}
                  className="h-7 rounded-md bg-black/20 border-white/10 text-xs focus-visible:ring-1 focus-visible:ring-white/20"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">Y Pos</Label>
                <Input
                  type="number"
                  min={0}
                  max={metadata.height - 1}
                  value={crop.y}
                  onChange={(e) => updateCrop({ y: Number(e.target.value) || 0 })}
                  className="h-7 rounded-md bg-black/20 border-white/10 text-xs focus-visible:ring-1 focus-visible:ring-white/20"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">Width</Label>
                <Input
                  type="number"
                  min={1}
                  max={metadata.width}
                  value={crop.width}
                  onChange={(e) => updateCrop({ width: Number(e.target.value) || 1 })}
                  className="h-7 rounded-md bg-black/20 border-white/10 text-xs focus-visible:ring-1 focus-visible:ring-white/20"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">Height</Label>
                <Input
                  type="number"
                  min={1}
                  max={metadata.height}
                  value={crop.height}
                  onChange={(e) => updateCrop({ height: Number(e.target.value) || 1 })}
                  className="h-7 rounded-md bg-black/20 border-white/10 text-xs focus-visible:ring-1 focus-visible:ring-white/20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
                onClick={fitCropToContent}
              >
                Fit crop to content
              </button>
              <button
                type="button"
                className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
                onClick={resetCrop}
              >
                Reset crop
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
