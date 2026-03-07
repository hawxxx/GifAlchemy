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
import { Lock, Unlock, Monitor, Smartphone, Square as SquareIcon, Layers } from "lucide-react";
import type { GifMetadata } from "@/core/domain/gif-types";
import type { OutputSettings, ResizePreset } from "@/core/domain/project";
import { RESIZE_PRESETS } from "@/core/domain/presets";
import { clamp } from "@/lib/utils";
import { cn } from "@/lib/utils";

const MAX_DIM = 2000;

const PRESET_ICONS: Record<string, any> = {
  original: Layers,
  square: SquareIcon,
  vertical: Smartphone,
  landscape: Monitor,
  twitter: Monitor,
  discord: SquareIcon,
};

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
    (preset: ResizePreset) => {
      if (!metadata) return;
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
      : (RESIZE_PRESETS as ResizePreset[]).find(
          (p) =>
            (p.width === width && p.height === height) ||
            (p.width === width && p.height === null)
        )?.id ?? "custom";

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Visual Presets Grid */}
      <div className="grid grid-cols-2 gap-2">
        {(RESIZE_PRESETS as ResizePreset[]).map((p) => {
          const Icon = PRESET_ICONS[p.id] || SquareIcon;
          const isActive = currentPresetId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handlePresetChange(p)}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all duration-300",
                isActive
                  ? "border-primary/50 bg-primary/10 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] ring-1 ring-primary/20"
                  : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
              )}
            >
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                isActive ? "bg-primary/20 text-primary" : "bg-white/5 text-white/40 group-hover:text-white/70"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-center">
                <span className={cn(
                  "block text-[10px] font-bold uppercase tracking-widest transition-colors",
                  isActive ? "text-white/90" : "text-white/30 group-hover:text-white/60"
                )}>
                  {p.label}
                </span>
                {p.width && (
                  <span className="mt-0.5 block text-[9px] font-medium text-white/20">
                    {p.width}{p.height ? `×${p.height}` : "w"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="h-px bg-white/5 shadow-[0_1px_0_rgba(255,255,255,0.02)]" />

      {/* Manual Controls */}
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-2">
          <Label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-white/25">Width</Label>
          <div className="relative group/input">
            <Input
              type="number"
              value={width || ""}
              onChange={(e) => handleWidthChange(e.target.value)}
              className="h-9 border-white/5 bg-white/[0.03] pl-3 pr-8 text-xs transition-all hover:bg-white/[0.05] focus:bg-black/40 focus:ring-1 focus:ring-primary/30"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white/20 group-focus-within/input:text-primary transition-colors">PX</span>
          </div>
        </div>
        
        <div className="flex flex-col justify-end pb-1.5 self-end">
          <Toggle
            pressed={aspectLock}
            onPressedChange={setAspectLock}
            className="h-8 w-8 rounded-lg border border-white/5 bg-white/[0.02] text-white/30 hover:bg-white/10 hover:text-white data-[state=on]:border-primary/40 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
          >
            {aspectLock ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </Toggle>
        </div>

        <div className="flex-1 space-y-2">
          <Label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-white/25">Height</Label>
          <div className="relative group/input">
            <Input
              type="number"
              value={height || ""}
              onChange={(e) => handleHeightChange(e.target.value)}
              className="h-9 border-white/5 bg-white/[0.03] pl-3 pr-8 text-xs transition-all hover:bg-white/[0.05] focus:bg-black/40 focus:ring-1 focus:ring-primary/30"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white/20 group-focus-within/input:text-primary transition-colors">PX</span>
          </div>
        </div>
      </div>
    </div>
  );
}
