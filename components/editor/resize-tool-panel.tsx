"use client";

import { useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, Unlock } from "lucide-react";
import type { GifMetadata } from "@/core/domain/gif-types";
import type { OutputSettings } from "@/core/domain/project";
import { RESIZE_PRESETS } from "@/core/domain/presets";
import { clamp } from "@/lib/utils";
import { cn } from "@/lib/utils";

const MAX_DIM = 2000;

export interface ResizeToolPanelProps {
  outputSettings: OutputSettings;
  metadata: GifMetadata | null;
  onOutputSettingsChange: (updates: Partial<OutputSettings>) => void;
  className?: string;
}

export function ResizeToolPanel({
  outputSettings,
  metadata,
  onOutputSettingsChange,
  className,
}: ResizeToolPanelProps) {
  const { width, height } = outputSettings;
  const aspectRatio = metadata ? metadata.width / metadata.height : 1;
  const currentRatio = width && height ? width / height : aspectRatio;
  const aspectLock = metadata ? Math.abs(currentRatio - aspectRatio) < 0.01 : false;
  const setAspectLock = (locked: boolean) => {
    if (!metadata || !locked) return;
    const ratio = metadata.width / metadata.height;
    onOutputSettingsChange({
      width: outputSettings.width,
      height: Math.round(outputSettings.width / ratio),
    });
  };

  const handleWidthChange = useCallback(
    (v: string) => {
      const n = clamp(parseInt(v, 10) || 0, 1, MAX_DIM);
      onOutputSettingsChange({ width: n });
      if (metadata && aspectLock) {
        const ratio = metadata.width / metadata.height;
        onOutputSettingsChange({ height: Math.round(n / ratio) });
      }
    },
    [metadata, aspectLock, onOutputSettingsChange]
  );

  const handleHeightChange = useCallback(
    (v: string) => {
      const n = clamp(parseInt(v, 10) || 0, 1, MAX_DIM);
      onOutputSettingsChange({ height: n });
      if (metadata && aspectLock) {
        const ratio = metadata.height / metadata.width;
        onOutputSettingsChange({ width: Math.round(n / ratio) });
      }
    },
    [metadata, aspectLock, onOutputSettingsChange]
  );

  const handlePresetChange = useCallback(
    (presetId: string) => {
      const preset = RESIZE_PRESETS.find((p) => p.id === presetId);
      if (!preset || !metadata) return;
      if (preset.width !== null && preset.height !== null) {
        onOutputSettingsChange({ width: preset.width, height: preset.height });
      } else if (preset.width !== null) {
        const ratio = metadata.height / metadata.width;
        onOutputSettingsChange({ width: preset.width, height: Math.round(preset.width * ratio) });
      } else {
        onOutputSettingsChange({ width: metadata.width, height: metadata.height });
      }
    },
    [metadata, onOutputSettingsChange]
  );

  const currentPresetId =
    metadata && width === metadata.width && height === metadata.height
      ? "original"
      : RESIZE_PRESETS.find(
          (p) =>
            (p.width === width && p.height === height) ||
            (p.width === width && p.height === null)
        )?.id ?? "original";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Width</Label>
          <Input
            type="number"
            min={1}
            max={MAX_DIM}
            value={width || ""}
            onChange={(e) => handleWidthChange(e.target.value)}
            className="rounded-lg mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Height</Label>
          <Input
            type="number"
            min={1}
            max={MAX_DIM}
            value={height || ""}
            onChange={(e) => handleHeightChange(e.target.value)}
            className="rounded-lg mt-1"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Toggle
          aria-label="Lock aspect ratio"
          pressed={aspectLock}
          onPressedChange={setAspectLock}
          className="rounded-lg"
        >
          {aspectLock ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        </Toggle>
        <Label className="text-xs">Lock aspect</Label>
      </div>
      <div>
        <Label className="text-xs">Preset</Label>
        <Select value={currentPresetId} onValueChange={handlePresetChange}>
          <SelectTrigger className="rounded-lg mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESIZE_PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id} className="rounded-lg">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
