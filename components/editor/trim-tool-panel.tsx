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

  const updateCrop = (updates: Partial<NonNullable<typeof crop>>) => {
    if (!metadata || !crop) return;
    const next = {
      ...crop,
      ...updates,
    };
    const x = Math.max(0, Math.min(metadata.width - 1, Math.round(next.x)));
    const y = Math.max(0, Math.min(metadata.height - 1, Math.round(next.y)));
    const width = Math.max(1, Math.min(metadata.width - x, Math.round(next.width)));
    const height = Math.max(1, Math.min(metadata.height - y, Math.round(next.height)));
    dispatch({
      type: "UPDATE_OUTPUT_SETTINGS",
      payload: { crop: { x, y, width, height }, width, height },
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Export only frames in this range. Playback still shows the full timeline.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Start frame</Label>
          <Input
            type="number"
            min={0}
            max={lastFrame}
            value={trimStart}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) setTrim(v, trimEnd);
            }}
            className="rounded-lg mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">End frame</Label>
          <Input
            type="number"
            min={trimStart}
            max={lastFrame}
            value={trimEnd}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) setTrim(trimStart, v);
            }}
            className="rounded-lg mt-1"
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">Range</Label>
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
          "text-xs text-muted-foreground hover:text-foreground underline",
          trimStart === 0 && trimEnd === lastFrame && "opacity-60 cursor-default no-underline"
        )}
      >
        Reset to full timeline
      </button>

      <div className="border-t border-border/50 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Crop</Label>
          {!crop ? (
            <button
              type="button"
              onClick={initCrop}
              className="text-xs text-primary hover:underline"
            >
              Enable crop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => dispatch({ type: "UPDATE_OUTPUT_SETTINGS", payload: { crop: null } })}
              className="text-xs text-muted-foreground hover:text-foreground underline"
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
            <div className="space-y-1.5">
              <Label className="text-[11px]">Aspect</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {CROP_RATIO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={cn(
                      "h-7 rounded-md border text-[11px] transition-colors",
                      (crop.aspectRatioPreset ?? "free") === preset.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/70 bg-background hover:bg-muted"
                    )}
                    onClick={() => setCropAspectPreset(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                className="h-7 rounded-md border border-border/70 bg-background text-[11px] hover:bg-muted"
                onClick={() => rotateCrop(-90)}
              >
                Rotate -90
              </button>
              <button
                type="button"
                className="h-7 rounded-md border border-border/70 bg-background text-[11px] hover:bg-muted"
                onClick={() => rotateCrop(90)}
              >
                Rotate +90
              </button>
              <div className="h-7 rounded-md border border-border/70 bg-muted/40 text-[11px] text-muted-foreground flex items-center justify-center tabular-nums">
                {(crop.rotation ?? 0)}°
              </div>
              <button
                type="button"
                className={cn(
                  "h-7 rounded-md border text-[11px] transition-colors",
                  crop.flipX
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/70 bg-background hover:bg-muted"
                )}
                onClick={() => updateCrop({ flipX: !crop.flipX })}
              >
                Flip X
              </button>
              <button
                type="button"
                className={cn(
                  "h-7 rounded-md border text-[11px] transition-colors",
                  crop.flipY
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/70 bg-background hover:bg-muted"
                )}
                onClick={() => updateCrop({ flipY: !crop.flipY })}
              >
                Flip Y
              </button>
              <button
                type="button"
                className="h-7 rounded-md border border-border/70 bg-background text-[11px] hover:bg-muted"
                onClick={() => updateCrop({ rotation: 0, flipX: false, flipY: false })}
              >
                Reset xf
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px]">X</Label>
                <Input
                  type="number"
                  min={0}
                  max={metadata.width - 1}
                  value={crop.x}
                  onChange={(e) => updateCrop({ x: Number(e.target.value) || 0 })}
                  className="rounded-lg mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px]">Y</Label>
                <Input
                  type="number"
                  min={0}
                  max={metadata.height - 1}
                  value={crop.y}
                  onChange={(e) => updateCrop({ y: Number(e.target.value) || 0 })}
                  className="rounded-lg mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px]">Width</Label>
                <Input
                  type="number"
                  min={1}
                  max={metadata.width}
                  value={crop.width}
                  onChange={(e) => updateCrop({ width: Number(e.target.value) || 1 })}
                  className="rounded-lg mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px]">Height</Label>
                <Input
                  type="number"
                  min={1}
                  max={metadata.height}
                  value={crop.height}
                  onChange={(e) => updateCrop({ height: Number(e.target.value) || 1 })}
                  className="rounded-lg mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="h-8 rounded-lg border border-border/70 bg-background text-[11px] hover:bg-muted"
                onClick={fitCropToContent}
              >
                Fit crop to content
              </button>
              <button
                type="button"
                className="h-8 rounded-lg border border-border/70 bg-background text-[11px] hover:bg-muted"
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
