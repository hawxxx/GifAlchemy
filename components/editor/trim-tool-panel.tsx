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
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-white/40 leading-relaxed font-medium">
        Export only frames in this range. Playback still shows the full timeline.
      </p>

      {/* Frame Range Inputs */}
      <div className="flex gap-3">
        <div className="flex-1 space-y-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Start Frame</Label>
          <div className="relative flex items-center">
            <Input
              type="number"
              min={0}
              max={lastFrame}
              value={trimStart}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v)) setTrim(v, trimEnd);
              }}
              className="h-8 rounded-md border-white/10 bg-black/20 pl-2 pr-6 text-xs text-white/90 placeholder:text-white/20 hover:border-white/20 focus-visible:border-primary/50 focus-visible:bg-black/40 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all font-medium"
            />
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-widest text-white/50">End Frame</Label>
          <div className="relative flex items-center">
            <Input
              type="number"
              min={trimStart}
              max={lastFrame}
              value={trimEnd}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v)) setTrim(trimStart, v);
              }}
              className="h-8 rounded-md border-white/10 bg-black/20 pl-2 pr-6 text-xs text-white/90 placeholder:text-white/20 hover:border-white/20 focus-visible:border-primary/50 focus-visible:bg-black/40 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all font-medium"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Range</Label>
          <span className="text-[10px] font-bold text-white/70 tabular-nums tracking-wide">
            {trimStart} – {trimEnd} <span className="text-white/30 font-medium">({trimmedCount} of {frameCount})</span>
          </span>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[10px] font-medium text-white/40">Start</span>
            </div>
            <Slider
              value={[trimStart]}
              min={0}
              max={lastFrame}
              step={1}
              onValueChange={([v]) => setTrim(v ?? 0, trimEnd)}
              className="[&_[data-slot=range]]:bg-primary [&_[data-slot=thumb]]:h-3 [&_[data-slot=thumb]]:w-3 [&_[data-slot=thumb]]:border-none [&_[data-slot=track]]:h-1 [&_[data-slot=track]]:bg-white/10"
            />
          </div>
          <div className="space-y-1.5">
             <div className="flex justify-between">
              <span className="text-[10px] font-medium text-white/40">End</span>
             </div>
            <Slider
              value={[trimEnd]}
              min={trimStart}
              max={lastFrame}
              step={1}
              onValueChange={([v]) => setTrim(trimStart, v ?? lastFrame)}
              className="[&_[data-slot=range]]:bg-primary [&_[data-slot=thumb]]:h-3 [&_[data-slot=thumb]]:w-3 [&_[data-slot=thumb]]:border-none [&_[data-slot=track]]:h-1 [&_[data-slot=track]]:bg-white/10"
            />
          </div>
        </div>
      </div>
      
      <button
        type="button"
        onClick={() => dispatch({ type: "SET_TRIM", payload: { trimStart: 0, trimEnd: lastFrame } })}
        className={cn(
          "h-8 w-full rounded-md border border-white/10 bg-white/[0.02] text-[11px] font-medium text-white/60 transition-all hover:bg-white/[0.05] hover:text-white active:scale-[0.98]",
          trimStart === 0 && trimEnd === lastFrame && "opacity-50 cursor-not-allowed hover:bg-white/[0.02] hover:text-white/60 active:scale-100"
        )}
      >
        Reset to full timeline
      </button>

      <div className="border-t border-white/5 pt-4 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] mt-1">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Crop</Label>
          {!crop ? (
            <button
              type="button"
              onClick={initCrop}
              className="text-[10px] font-bold tracking-wide uppercase text-primary hover:text-primary/80 transition-colors"
            >
              Enable
            </button>
          ) : (
            <button
              type="button"
              onClick={() => dispatch({ type: "UPDATE_OUTPUT_SETTINGS", payload: { crop: null } })}
              className="text-[10px] font-bold tracking-wide uppercase text-white/40 hover:text-white transition-colors"
            >
              Disable
            </button>
          )}
        </div>

        {crop && metadata && (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-medium text-white/40 leading-relaxed">
              Drag crop box directly on the canvas, or fine-tune here.
            </p>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-white/50 block">Aspect</Label>
              <div className="flex gap-1.5">
                {CROP_RATIO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={cn(
                      "flex-1 h-7 rounded border text-[10px] font-bold transition-all duration-150 tracking-wide",
                      (crop.aspectRatioPreset ?? "free") === preset.id
                        ? "border-primary bg-primary/20 text-primary shadow-sm"
                        : "border-white/10 bg-black/20 text-white/50 hover:bg-white/[0.04] hover:text-white"
                    )}
                    onClick={() => setCropAspectPreset(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-1.5 pt-1">
              <button
                type="button"
                className="flex-1 h-7 rounded border border-white/10 bg-black/20 text-[10px] font-bold tracking-wide text-white/50 hover:bg-white/[0.04] hover:text-white transition-all duration-150"
                onClick={() => rotateCrop(-90)}
              >
                -90°
              </button>
              <button
                type="button"
                className="flex-1 h-7 rounded border border-white/10 bg-black/20 text-[10px] font-bold tracking-wide text-white/50 hover:bg-white/[0.04] hover:text-white transition-all duration-150"
                onClick={() => rotateCrop(90)}
              >
                +90°
              </button>
              <div className="w-10 shrink-0 h-7 rounded border border-white/5 bg-white/5 text-[10px] font-bold tracking-wide text-white flex items-center justify-center tabular-nums">
                {(crop.rotation ?? 0)}°
              </div>
            </div>
            
            <div className="flex gap-1.5">
              <button
                type="button"
                className={cn(
                  "flex-1 h-7 rounded border text-[10px] font-bold tracking-wide transition-all duration-150",
                  crop.flipX
                    ? "border-primary bg-primary/20 text-primary shadow-sm"
                    : "border-white/10 bg-black/20 text-white/50 hover:bg-white/[0.04] hover:text-white"
                )}
                onClick={() => updateCrop({ flipX: !crop.flipX })}
              >
                Flip X
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 h-7 rounded border text-[10px] font-bold tracking-wide transition-all duration-150",
                  crop.flipY
                    ? "border-primary bg-primary/20 text-primary shadow-sm"
                    : "border-white/10 bg-black/20 text-white/50 hover:bg-white/[0.04] hover:text-white"
                )}
                onClick={() => updateCrop({ flipY: !crop.flipY })}
              >
                Flip Y
              </button>
              <button
                type="button"
                className="flex-[1.5] h-7 rounded border border-white/10 bg-black/20 text-[10px] font-bold tracking-wide text-white/50 hover:bg-white/[0.04] hover:text-white transition-all duration-150"
                onClick={() => updateCrop({ rotation: 0, flipX: false, flipY: false })}
              >
                Reset XF
              </button>
            </div>
            
            {/* Dimensions Grid */}
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2 mt-1 grid grid-cols-2 gap-x-2 gap-y-2">
              <div className="flex items-center justify-between px-1">
                <Label className="text-[10px] font-medium text-white/40 tracking-wider">X</Label>
                <Input
                  type="number"
                  min={0}
                  max={metadata.width - 1}
                  value={crop.x}
                  onChange={(e) => updateCrop({ x: Number(e.target.value) || 0 })}
                  className="h-6 w-14 rounded bg-black/20 border-white/10 text-[10px] font-medium text-white/80 px-1 text-right focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:bg-black/40"
                />
              </div>
              <div className="flex items-center justify-between px-1">
                <Label className="text-[10px] font-medium text-white/40 tracking-wider">Y</Label>
                <Input
                  type="number"
                  min={0}
                  max={metadata.height - 1}
                  value={crop.y}
                  onChange={(e) => updateCrop({ y: Number(e.target.value) || 0 })}
                  className="h-6 w-14 rounded bg-black/20 border-white/10 text-[10px] font-medium text-white/80 px-1 text-right focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:bg-black/40"
                />
              </div>
              <div className="flex items-center justify-between px-1">
                <Label className="text-[10px] font-medium text-white/40 tracking-wider">W</Label>
                <Input
                  type="number"
                  min={1}
                  max={metadata.width}
                  value={crop.width}
                  onChange={(e) => updateCrop({ width: Number(e.target.value) || 1 })}
                  className="h-6 w-14 rounded bg-black/20 border-white/10 text-[10px] font-medium text-white/80 px-1 text-right focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:bg-black/40"
                />
              </div>
              <div className="flex items-center justify-between px-1">
                <Label className="text-[10px] font-medium text-white/40 tracking-wider">H</Label>
                <Input
                  type="number"
                  min={1}
                  max={metadata.height}
                  value={crop.height}
                  onChange={(e) => updateCrop({ height: Number(e.target.value) || 1 })}
                  className="h-6 w-14 rounded bg-black/20 border-white/10 text-[10px] font-medium text-white/80 px-1 text-right focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:bg-black/40"
                />
              </div>
            </div>
            
            <div className="flex gap-2 w-full mt-1">
              <button
                type="button"
                className="flex-1 h-8 rounded-md border border-white/10 bg-white/[0.02] text-[10px] font-bold tracking-wide uppercase text-white/60 hover:bg-white/[0.05] hover:text-white transition-all duration-150 active:scale-[0.98]"
                onClick={fitCropToContent}
              >
                Auto-Fit
              </button>
              <button
                type="button"
                className="flex-1 h-8 rounded-md border border-white/10 bg-white/[0.02] text-[10px] font-bold tracking-wide uppercase text-white/60 hover:bg-white/[0.05] hover:text-white transition-all duration-150 active:scale-[0.98]"
                onClick={resetCrop}
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
