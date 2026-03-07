"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Trash2, Plus, Type, Bold, Italic, Copy, Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { useOverlays } from "@/hooks/use-overlays";
import { useEditor } from "@/hooks/use-editor";
import { ANIMATION_PRESETS } from "@/core/domain/presets";
import type { AnimationPresetType, Overlay } from "@/core/domain/project";
import { cn } from "@/lib/utils";
import { FontLoader } from "@/components/editor/font-loader";
import { FontPicker, FONTS } from "@/components/editor/font-picker";

/** CSS animation name per effect id. */
const EFFECT_ANIM: Record<string, string> = {
  "fade-in":    "ef-fade-in 1.8s ease-in-out infinite",
  "fade-out":   "ef-fade-out 1.8s ease-in-out infinite",
  "slide-up":   "ef-slide-up 1.8s ease-out infinite",
  "slide-down": "ef-slide-down 1.8s ease-in infinite",
  "pop":        "ef-pop 1.6s ease-out infinite",
  "scale-in":   "ef-scale-in 1.6s ease-out infinite",
  "rotate-in":  "ef-rotate-in 1.6s ease-out infinite",
  "flicker":    "ef-flicker 1.2s linear infinite",
  "bounce":     "ef-bounce 1.6s ease-out infinite",
  "shake":      "ef-shake 1.2s linear infinite",
  "wiggle":     "ef-wiggle 1.4s ease-in-out infinite",
  "pulse":      "ef-pulse 1.4s ease-in-out infinite",
  "typewriter": "ef-typewriter 1.8s ease-out infinite",
  "neon-glow":  "ef-neon-glow 1.5s ease-in-out infinite",
  "glitch":     "ef-glitch 0.8s step-end infinite",
  "rainbow":    "ef-rainbow 2s linear infinite",
  "deep-burn":  "ef-deep-burn 1.5s ease-in-out infinite",
  "ghosting":   "ef-ghosting 2s ease-in-out infinite",
  "scanner":    "ef-scanner 2s ease-in-out infinite",
  "chrome":     "ef-pulse 1.4s ease-in-out infinite", /* Placeholder for chrome until we have a proper chrome effect */
};

function EffectCard({
  id,
  label,
  selected,
  onSelect,
}: {
  id: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const anim = id === "none" ? undefined : EFFECT_ANIM[id];
  const isTypewriter = id === "typewriter";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center gap-1 rounded-xl border-2 p-1.5 transition-all duration-[var(--duration-ui)] ease-[var(--ease-out)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.95] group",
        selected
          ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]"
          : "border-white/5 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] hover:shadow-lg active:bg-white/[0.08]"
      )}
    >
      {selected && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-white shadow-[0_2px_10px_rgba(var(--primary-rgb),0.5)] z-10">
          ✓
        </span>
      )}
      <div className="flex h-10 w-full items-center justify-center overflow-hidden rounded-lg bg-black/60 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] transition-transform group-hover:scale-[1.05]">
        {isTypewriter ? (
          <span className="inline-flex items-end text-[11px] font-black tracking-widest text-white select-none">
            <span
              className="inline-block overflow-hidden whitespace-nowrap"
              style={{ width: "0ch", animation: "ef-typewriter-steps 1.8s steps(2, end) infinite" }}
            >
              FX
            </span>
            <span className="inline-block w-[0.12em] min-w-[2px] h-[1em] ml-px align-baseline bg-current animate-typewriter-cursor" />
          </span>
        ) : (
          <span
            className="text-[11px] font-black tracking-widest text-white select-none"
            style={anim ? { animation: anim } : undefined}
          >
            FX
          </span>
        )}
      </div>
      <span className={cn(
        "text-[9px] leading-tight font-bold tracking-widest uppercase truncate w-full text-center mt-0.5",
        selected ? "text-primary" : "text-white/40 group-hover:text-white/70"
      )}>
        {label}
      </span>
    </button>
  );
}

export function TextToolPanel() {
  const {
    overlays,
    selectedOverlayId,
    addOverlay,
    selectOverlay,
    updateOverlay,
    removeOverlay,
    duplicateOverlay,
    reorderOverlays,
    bakeEffect,
    clearEffect,
  } = useOverlays();
  const { state, contentInputRef } = useEditor();
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);

  const selected = overlays.find((o) => o.id === selectedOverlayId) ?? overlays[0] ?? null;
  const activeEffect = selected?.effects[0]?.type ?? "none";
  const selectedLocked = selected?.locked === true;
  const frameLast = Math.max(0, state.frames.length - 1);
  const effectStart = selected?.effects[0]?.startFrame ?? 0;
  const effectEnd = selected?.effects[0]?.endFrame ?? frameLast;
  const multiSelectedSet = useMemo(() => new Set(multiSelectedIds), [multiSelectedIds]);
  const hasMultiSelection = multiSelectedIds.length > 1;
  const selectedLineHeight = selected?.lineHeight ?? 1.2;
  const selectedLetterSpacing = selected?.letterSpacing ?? 0;
  const selectedTextPreset = selected?.textPreset ?? "none";

  const updateSelectedOverlay = (updates: Partial<Overlay>) => {
    if (!selected) return;
    updateOverlay(selected.id, updates as never);
  };

  useEffect(() => {
    // Drop stale ids when overlays are removed.
    setMultiSelectedIds((prev) => prev.filter((id) => overlays.some((o) => o.id === id)));
  }, [overlays]);

  const applyBatchVisibility = (visible: boolean) => {
    multiSelectedIds.forEach((id) => updateOverlay(id, { visible }));
  };

  const applyBatchLock = (locked: boolean) => {
    multiSelectedIds.forEach((id) => updateOverlay(id, { locked }));
  };

  const removeBatch = () => {
    multiSelectedIds.forEach((id) => {
      const overlay = overlays.find((o) => o.id === id);
      if (!overlay?.locked) removeOverlay(id);
    });
    setMultiSelectedIds([]);
  };

  return (
    <div className="flex flex-col gap-4">
      <FontLoader />
      {/* Layer list */}
      {overlays.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Text Layers
            </p>
            {hasMultiSelection && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-medium text-white/40 mr-1">
                  {multiSelectedIds.length} selected
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-all rounded"
                  onClick={() => applyBatchVisibility(false)}
                >
                  Hide
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-all rounded"
                  onClick={() => applyBatchVisibility(true)}
                >
                  Show
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-all rounded"
                  onClick={() => applyBatchLock(true)}
                >
                  Lock
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-all rounded"
                  onClick={() => applyBatchLock(false)}
                >
                  Unlock
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-6 px-2 text-[10px] font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all rounded"
                  onClick={removeBatch}
                >
                  Del
                </Button>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-1.5 space-y-1">
            {overlays.map((overlay) => {
              const isPrimarySelected = (selectedOverlayId ?? overlays[0]?.id) === overlay.id;
              const isMultiSelected = multiSelectedSet.has(overlay.id);
              const isSelected = isPrimarySelected || isMultiSelected;
              return (
                <div
                  key={overlay.id}
                  className={cn(
                    "group flex items-center gap-1 px-1.5 py-1.5 rounded cursor-pointer transition-colors duration-100",
                    isSelected
                      ? "bg-primary/20 text-white"
                      : "hover:bg-white/[0.04] text-white/60 hover:text-white/90",
                    overlay.locked && "opacity-60"
                  )}
                  draggable={overlay.locked !== true}
                  onDragStart={(e) => {
                    if (overlay.locked) {
                      e.preventDefault();
                      return;
                    }
                    e.dataTransfer.setData("text/plain", overlay.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    if (overlay.locked) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    if (overlay.locked) return;
                    e.preventDefault();
                    const fromId = e.dataTransfer.getData("text/plain");
                    if (fromId) reorderOverlays(fromId, overlay.id);
                  }}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      setMultiSelectedIds((prev) =>
                        prev.includes(overlay.id)
                          ? prev.filter((id) => id !== overlay.id)
                          : [...prev, overlay.id]
                      );
                      selectOverlay(overlay.id);
                      return;
                    }
                    setMultiSelectedIds([overlay.id]);
                    selectOverlay(overlay.id);
                  }}
                  title="Click to select. Shift+click for multi-select. Drag to reorder."
                >
                  <button
                    className={cn(
                      "shrink-0 p-0.5 rounded transition-opacity",
                      overlay.visible === false ? "opacity-30 hover:opacity-100 text-white" : "opacity-0 group-hover:opacity-100 text-white/50 hover:text-white"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOverlay(overlay.id, {
                        visible: overlay.visible === false,
                      });
                    }}
                    aria-label={overlay.visible === false ? "Show layer" : "Hide layer"}
                    title={overlay.visible === false ? "Show layer" : "Hide layer"}
                  >
                    {overlay.visible === false ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    className={cn(
                      "shrink-0 p-0.5 rounded transition-opacity",
                      overlay.locked ? "text-amber-500/80 opacity-100 hover:text-amber-400" : "opacity-0 group-hover:opacity-100 text-white/50 hover:text-white"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOverlay(overlay.id, {
                        locked: overlay.locked !== true,
                      });
                    }}
                    aria-label={overlay.locked ? "Unlock layer" : "Lock layer"}
                    title={overlay.locked ? "Unlock layer" : "Lock layer"}
                  >
                    {overlay.locked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </button>
                  <Type className="h-3 w-3 shrink-0 ml-1 mr-1 opacity-50" />
                  <span className="text-[11px] font-semibold truncate flex-1">{overlay.content || "Text"}</span>
                  <button
                    className={cn(
                      "transition-opacity p-0.5 rounded bg-transparent hover:bg-white/10 active:scale-95 text-white/50 hover:text-white",
                      isSelected
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateOverlay(overlay.id);
                    }}
                    aria-label="Duplicate"
                    title="Duplicate layer"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    className={cn(
                      "transition-opacity p-0.5 rounded bg-transparent hover:bg-red-500/20 active:scale-95 text-white/50",
                      isSelected
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                      overlay.locked
                        ? "cursor-not-allowed text-white/20 hover:text-white/20 hover:bg-transparent"
                        : "hover:text-red-400"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOverlay(overlay.id);
                    }}
                    disabled={overlay.locked}
                    aria-label="Remove"
                    title={overlay.locked ? "Unlock layer to remove" : "Remove layer"}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add button */}
      <Button
        variant="outline"
        className="w-full h-8 rounded-lg gap-2 border border-white/10 bg-white/[0.02] text-[11px] font-bold tracking-wide uppercase text-white/60 hover:bg-white/[0.05] hover:text-white hover:border-white/20 transition-all duration-150 ease-out active:scale-[0.98]"
        onClick={() => addOverlay()}
        disabled={state.frames.length === 0}
      >
        <Plus className="h-3.5 w-3.5" />
        New Text Layer
      </Button>

      {selected && (
        <div className="flex flex-col gap-4 mt-2">
          {/* Header */}
          <div className="flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Properties</p>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-colors",
                selectedLocked
                  ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                  : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80"
              )}
              onClick={() =>
                updateOverlay(selected.id, {
                  locked: !selectedLocked,
                })
              }
            >
              {selectedLocked ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5" />}
              {selectedLocked ? "Locked" : "Unlocked"}
            </button>
          </div>
          {selectedLocked && (
            <p className="text-[10px] font-medium text-amber-500/80 leading-relaxed bg-amber-500/[0.05] p-2 rounded-md border border-amber-500/10">
              Layer is locked. Unlock to edit styles & effects.
            </p>
          )}

          {/* Text Input */}
          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <Input
                ref={contentInputRef}
                value={selected.content}
                onChange={(e) => updateOverlay(selected.id, { content: e.target.value })}
                className="h-9 rounded-md border-white/10 bg-black/20 text-xs font-medium text-white/90 placeholder:text-white/20 hover:border-white/20 focus-visible:border-primary/50 focus-visible:bg-black/40 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                placeholder="Type something..."
                disabled={selectedLocked}
              />
            </div>
          </div>

          {/* Typography Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-white/50 block">Font</Label>
              <FontPicker
                fonts={FONTS}
                value={selected.fontFamily}
                onChange={(font) => updateOverlay(selected.id, { fontFamily: font })}
                disabled={selectedLocked}
                className="h-8 border-white/10 bg-black/20 text-white/90 focus-visible:ring-1 focus-visible:ring-primary/20 hover:border-white/20 transition-all text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-white/50 block">Size</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={selected.fontSize}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!isNaN(v) && v >= 1) updateOverlay(selected.id, { fontSize: v });
                  }}
                  className="h-8 rounded-md border-white/10 bg-black/20 text-xs text-white/90 focus-visible:ring-1 focus-visible:ring-primary/20 hover:border-white/20 transition-all pl-2 pr-6"
                  disabled={selectedLocked}
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-medium text-white/30 uppercase tracking-widest">PX</span>
              </div>
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            {/* Font Size Slider */}
            <div className="space-y-1.5 col-span-2">
              <Slider
                value={[selected.fontSize]}
                min={8}
                max={160}
                step={1}
                disabled={selectedLocked}
                onValueChange={([v]) => updateOverlay(selected.id, { fontSize: v ?? 32 })}
                className="[&_[data-slot=range]]:bg-primary [&_[data-slot=thumb]]:h-3 [&_[data-slot=thumb]]:w-3 [&_[data-slot=thumb]]:border-none [&_[data-slot=track]]:h-1 [&_[data-slot=track]]:bg-white/10"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-medium text-white/50 tracking-wide">Line Hg.</Label>
                <span className="text-[10px] font-bold text-white/70 tabular-nums">{selectedLineHeight.toFixed(2)}</span>
              </div>
              <Slider
                value={[selectedLineHeight]}
                min={0.8}
                max={3}
                step={0.05}
                disabled={selectedLocked}
                onValueChange={([v]) => updateSelectedOverlay({ lineHeight: Number((v ?? 1.2).toFixed(2)) })}
                className="[&_[data-slot=range]]:bg-white/30 [&_[data-slot=thumb]]:h-2.5 [&_[data-slot=thumb]]:w-2.5 [&_[data-slot=thumb]]:border-none [&_[data-slot=track]]:h-1 [&_[data-slot=track]]:bg-white/10"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-medium text-white/50 tracking-wide">Spacing</Label>
                <span className="text-[10px] font-bold text-white/70 tabular-nums">{selectedLetterSpacing.toFixed(1)}</span>
              </div>
              <Slider
                value={[selectedLetterSpacing]}
                min={-8}
                max={24}
                step={0.5}
                disabled={selectedLocked}
                onValueChange={([v]) => updateSelectedOverlay({ letterSpacing: Number((v ?? 0).toFixed(1)) })}
                className="[&_[data-slot=range]]:bg-white/30 [&_[data-slot=thumb]]:h-2.5 [&_[data-slot=thumb]]:w-2.5 [&_[data-slot=thumb]]:border-none [&_[data-slot=track]]:h-1 [&_[data-slot=track]]:bg-white/10"
              />
            </div>
          </div>

          {/* Stepped Motion Toggle */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
             <div className="flex flex-col gap-0.5">
               <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">Stepped Motion</Label>
               <span className="text-[9px] text-white/20">Disable interpolation</span>
             </div>
             <button
               type="button"
               onClick={() => updateSelectedOverlay({ disableTweening: !selected.disableTweening })}
               disabled={selectedLocked}
               className={cn(
                 "h-7 px-4 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95",
                 selected.disableTweening
                   ? "bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                   : "bg-white/5 text-white/30 border border-white/5 hover:bg-white/10 hover:text-white/60"
               )}
             >
               {selected.disableTweening ? "Active" : "Off"}
             </button>
          </div>

          {/* Formatting Row */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-white/50 block">Align</Label>
              <div className="flex gap-1">
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    className={cn(
                      "flex-1 h-7 rounded border text-[10px] font-bold capitalize transition-all duration-150 active:scale-95",
                      (selected.textAlign ?? "center") === align
                        ? "border-primary bg-primary/20 text-primary shadow-sm"
                        : "border-white/10 bg-black/20 text-white/50 hover:bg-white/[0.04] hover:text-white"
                    )}
                    disabled={selectedLocked}
                    onClick={() => updateOverlay(selected.id, { textAlign: align })}
                  >
                    {align.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
               <Label className="text-[10px] font-semibold uppercase tracking-widest text-white/50 block">Style</Label>
               <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Bold"
                  onClick={() =>
                    updateOverlay(selected.id, {
                      fontWeight: selected.fontWeight === "bold" ? "normal" : "bold",
                    })
                  }
                  disabled={selectedLocked}
                  className={cn(
                    "h-7 w-8 flex items-center justify-center rounded border transition-all duration-150 active:scale-95",
                    selectedLocked && "cursor-not-allowed opacity-50",
                    selected.fontWeight === "bold"
                      ? "border-primary bg-primary/20 text-primary shadow-sm"
                      : "border-white/10 bg-black/20 text-white/50 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Italic"
                  onClick={() =>
                    updateOverlay(selected.id, {
                      fontStyle: selected.fontStyle === "italic" ? "normal" : "italic",
                    })
                  }
                  disabled={selectedLocked}
                  className={cn(
                    "h-7 w-8 flex items-center justify-center rounded border transition-all duration-150 active:scale-95",
                    selectedLocked && "cursor-not-allowed opacity-50",
                    selected.fontStyle === "italic"
                      ? "border-primary bg-primary/20 text-primary shadow-sm"
                      : "border-white/10 bg-black/20 text-white/50 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
               </div>
            </div>
          </div>

          {/* Color & Fill */}
          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-white/5">
             <div className="flex flex-col gap-1.5">
               <Label className="text-[10px] font-semibold uppercase tracking-widest text-white/50 block">Color</Label>
               <div className="flex gap-2 items-center">
                 <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateOverlay(selected.id, { color: e.target.value })}
                  className="w-7 h-7 rounded-md border-0 p-0 cursor-pointer bg-transparent"
                  disabled={selectedLocked}
                />
                <span className="text-[10px] font-mono text-white/60 tracking-wider bg-black/20 px-1.5 py-1 rounded border border-white/5">{selected.color?.toUpperCase()}</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-white/50 block">Fill Type</Label>
                <div className="flex p-0.5 rounded-lg border border-white/10 bg-black/20">
                  {(["solid", "gradient"] as const).map((fillType) => (
                    <button
                      key={fillType}
                      type="button"
                      className={cn(
                        "flex-1 h-6 rounded-md text-[9px] font-bold uppercase tracking-wider transition-colors",
                        (selected.fillType ?? "solid") === fillType
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-white/40 hover:text-white/80"
                      )}
                      disabled={selectedLocked}
                      onClick={() => updateSelectedOverlay({ fillType })}
                    >
                      {fillType}
                    </button>
                  ))}
                </div>
             </div>
          </div>

          {(selected.fillType ?? "solid") === "gradient" && (
            <div className="flex gap-3 bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
               <div className="flex-1 flex flex-col gap-1">
                 <Label className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Grad From</Label>
                 <div className="flex gap-2 items-center">
                   <input
                    type="color"
                    value={selected.gradientFrom ?? "#ffffff"}
                    disabled={selectedLocked}
                    onChange={(e) => updateSelectedOverlay({ gradientFrom: e.target.value })}
                    className="h-6 w-6 rounded border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <span className="text-[9px] font-mono text-white/40 tracking-wider">{(selected.gradientFrom ?? "#ffffff").toUpperCase()}</span>
                 </div>
               </div>
               <div className="flex-1 flex flex-col gap-1">
                 <Label className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Grad To</Label>
                 <div className="flex gap-2 items-center">
                   <input
                    type="color"
                    value={selected.gradientTo ?? "#5B8CFF"}
                    disabled={selectedLocked}
                    onChange={(e) => updateSelectedOverlay({ gradientTo: e.target.value })}
                    className="h-6 w-6 rounded border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <span className="text-[9px] font-mono text-white/40 tracking-wider">{(selected.gradientTo ?? "#5B8CFF").toUpperCase()}</span>
                 </div>
               </div>
            </div>
          )}

          {/* Shadow & Stroke */}
          <div className="flex flex-col gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="grid grid-cols-2 gap-4">
               {/* Stroke settings */}
               <div className="space-y-2">
                 <div className="flex items-center justify-between">
                   <Label className="text-[10px] font-semibold text-white/50 tracking-wider">Stroke Width</Label>
                   <span className="text-[10px] font-bold text-white/70 tabular-nums">{selected.strokeWidth ?? 0}</span>
                 </div>
                 <Slider
                   value={[selected.strokeWidth ?? 0]}
                   min={0}
                   max={20}
                   step={0.5}
                   disabled={selectedLocked}
                   onValueChange={([v]) => updateOverlay(selected.id, { strokeWidth: v ?? 0 })}
                   className="[&_[data-slot=range]]:bg-white/30 [&_[data-slot=thumb]]:h-2.5 [&_[data-slot=thumb]]:w-2.5 [&_[data-slot=thumb]]:border-none [&_[data-slot=track]]:h-1 [&_[data-slot=track]]:bg-white/10"
                 />
                 {(selected.strokeWidth ?? 0) > 0 && (
                   <div className="flex items-center gap-2 pt-1">
                     <input
                        type="color"
                        value={selected.strokeColor ?? "#000000"}
                        onChange={(e) => updateOverlay(selected.id, { strokeColor: e.target.value })}
                        className="w-5 h-5 rounded border-0 cursor-pointer p-0 bg-transparent"
                        disabled={selectedLocked}
                      />
                      <span className="text-[9px] font-mono text-white/40">{selected.strokeColor ?? "#000000"}</span>
                   </div>
                 )}
               </div>
               
               {/* Shadow Settings */}
               <div className="space-y-2">
                 <div className="flex items-center justify-between">
                   <Label className="text-[10px] font-semibold text-white/50 tracking-wider">Shadow Blur</Label>
                   <span className="text-[10px] font-bold text-white/70 tabular-nums">{selected.textShadowBlur ?? 0}</span>
                 </div>
                 <Slider
                   value={[selected.textShadowBlur ?? 0]}
                   min={0}
                   max={64}
                   step={1}
                   disabled={selectedLocked}
                   onValueChange={([v]) => updateSelectedOverlay({ textShadowBlur: v ?? 0 })}
                   className="[&_[data-slot=range]]:bg-white/30 [&_[data-slot=thumb]]:h-2.5 [&_[data-slot=thumb]]:w-2.5 [&_[data-slot=thumb]]:border-none [&_[data-slot=track]]:h-1 [&_[data-slot=track]]:bg-white/10"
                 />
                  {!!(selected.textShadowBlur ?? 0) && (
                   <div className="flex items-center gap-2 pt-1">
                     <input
                        type="color"
                        value={selected.textShadowColor ?? "#000000"}
                        onChange={(e) => updateSelectedOverlay({ textShadowColor: e.target.value })}
                        className="w-5 h-5 rounded border-0 cursor-pointer p-0 bg-transparent"
                        disabled={selectedLocked}
                      />
                      <span className="text-[9px] font-mono text-white/40">{selected.textShadowColor ?? "#000000"}</span>
                   </div>
                 )}
               </div>
            </div>
             
            <div className="h-px bg-white/5 my-2" />
            
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Bg Chip</Label>
              <div className="flex items-center gap-2">
                {(selected.backgroundColor ?? "#00000000") !== "#00000000" && (
                   <input
                    type="color"
                    value={selected.backgroundColor}
                    onChange={(e) => updateSelectedOverlay({ backgroundColor: e.target.value })}
                    className="h-5 w-5 rounded border-0 cursor-pointer bg-transparent p-0"
                    disabled={selectedLocked}
                  />
                )}
                <button
                  type="button"
                  className={cn(
                    "h-6 px-3 rounded text-[9px] font-bold uppercase tracking-wider transition-colors",
                    (selected.backgroundColor ?? "#00000000") !== "#00000000"
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "bg-black/20 border border-white/10 text-white/40 hover:bg-white/5"
                  )}
                  disabled={selectedLocked}
                  onClick={() =>
                    updateSelectedOverlay({
                      backgroundColor:
                        (selected.backgroundColor ?? "#00000000") === "#00000000" ? "#10141A" : "#00000000",
                      backgroundPaddingX: 14,
                      backgroundPaddingY: 8,
                      backgroundRadius: 12,
                    })
                  }
                >
                  {(selected.backgroundColor ?? "#00000000") === "#00000000" ? "Enable" : "Enabled"}
                </button>
              </div>
            <div className="space-y-3 pt-4">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Premium Styles</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: "glass-sticker",
                    label: "Glass",
                    desc: "Frost & Shadow",
                    bg: "from-white/10 to-transparent",
                    border: "border-white/20",
                    fx: <div className="absolute -right-2 -top-2 h-10 w-10 rounded-full bg-white/20 blur-xl group-hover:bg-white/30 transition-colors" />
                  },
                  {
                    id: "cyber-neon",
                    label: "Neon",
                    desc: "Synthwave Glow",
                    bg: "from-cyan-500/10 to-transparent",
                    border: "border-cyan-500/30",
                    fx: <div className="absolute -inset-0.5 rounded-xl border border-cyan-400/50 opacity-0 group-hover:opacity-100 transition-opacity shadow-[inset_0_0_12px_rgba(34,211,238,0.4),0_0_8px_rgba(34,211,238,0.6)]" />
                  },
                  {
                    id: "modern-type",
                    label: "Modern",
                    desc: "Clean & Bold",
                    bg: "from-white/5 to-black/30",
                    border: "border-white/10",
                    fx: <div className="absolute bottom-0 left-0 h-[3px] w-0 bg-white group-hover:w-full transition-all duration-500 ease-out" />
                  },
                  {
                    id: "floating",
                    label: "Float",
                    desc: "Airy Elevation",
                    bg: "from-indigo-500/10 to-transparent",
                    border: "border-indigo-500/20",
                    fx: <div className="absolute inset-x-4 bottom-1 h-2 rounded-[100%] bg-black/80 blur-[4px] opacity-0 group-hover:opacity-100 group-hover:translate-y-1 transition-all duration-300" />
                  },
                  {
                    id: "deep-burn",
                    label: "Burn",
                    desc: "Embers & Heat",
                    bg: "from-orange-500/10 to-black/20",
                    border: "border-orange-500/20",
                    fx: <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-orange-500/40 to-transparent mix-blend-color-dodge opacity-30 group-hover:opacity-100 transition-opacity duration-300" />
                  },
                  {
                    id: "sketch",
                    label: "Sketch",
                    desc: "Rough Pencil",
                    bg: "from-yellow-500/10 to-transparent",
                    border: "border-yellow-500/20",
                    fx: (
                       <svg className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-4 w-full opacity-20 group-hover:opacity-50 transition-opacity duration-300 text-yellow-500" preserveAspectRatio="none" viewBox="0 0 100 20">
                         <path d="M2,10 Q25,2 50,10 T98,10" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" />
                       </svg>
                    )
                  }
                ].map((preset) => {
                  const isActive = selectedTextPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() =>
                        updateSelectedOverlay({ textPreset: isActive ? "none" : preset.id })
                      }
                      className={cn(
                        "group relative overflow-hidden flex flex-col items-start gap-0.5 rounded-[12px] border p-3 text-left transition-all duration-300 active:scale-95",
                        isActive
                          ? `border-primary shadow-[0_4px_20px_rgba(var(--primary-rgb),0.3),inset_0_1px_0_rgba(255,255,255,0.2)] bg-primary/20`
                          : `bg-gradient-to-br ${preset.bg} ${preset.border} hover:border-white/30 hover:shadow-[0_8px_16px_rgba(0,0,0,0.4)]`
                      )}
                    >
                      {preset.fx}
                      {/* Active Indicator Dot */}
                      <div className={cn("absolute top-3 right-3 h-1.5 w-1.5 rounded-full transition-all duration-300", isActive ? "bg-white shadow-[0_0_10px_rgba(255,255,255,1)] scale-100" : "bg-white/10 scale-75 group-hover:bg-white/30")} />
                      
                      <span className={cn("relative z-10 text-[11px] font-black uppercase tracking-widest", isActive ? "text-white" : "text-white/80 group-hover:text-white transition-colors")}>
                        {preset.label}
                      </span>
                      <span className={cn("relative z-10 text-[9px] font-medium tracking-wide", isActive ? "text-primary-foreground/80" : "text-white/40 group-hover:text-white/60 transition-colors")}>
                        {preset.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

          {/* Text Effects Grid */}
          <div className="space-y-3">
             <div className="flex items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-4">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Text Effects</Label>
             </div>
             <div className="grid grid-cols-4 gap-1.5">
               {ANIMATION_PRESETS.map((p) => (
                 <EffectCard
                   key={p.id}
                   id={p.id}
                   label={p.label}
                   selected={activeEffect === p.id}
                   onSelect={() => {
                     if (selectedLocked) return;
                     if (p.id === "none") {
                       clearEffect(selected.id);
                     } else {
                       const nextStart = selected.effects[0]?.startFrame ?? 0;
                       const nextEnd = selected.effects[0]?.endFrame ?? frameLast;
                       bakeEffect(
                         selected.id,
                         p.id as AnimationPresetType,
                         Math.max(0, Math.min(frameLast, nextStart)),
                         Math.max(
                           Math.max(0, Math.min(frameLast, nextStart)),
                           Math.max(0, Math.min(frameLast, nextEnd))
                         )
                       );
                     }
                   }}
                 />
               ))}
             </div>
             {(activeEffect as string) !== "none" && (
                <div className="grid grid-cols-2 gap-3 mt-1 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-white/40 block">Start Fr.</Label>
                    <Input
                      type="number"
                      min={0}
                      max={frameLast}
                      value={effectStart}
                      disabled={selectedLocked}
                      onChange={(e) => {
                        const nextStart = Math.max(0, Math.min(frameLast, Number(e.target.value) || 0));
                        const nextEnd = Math.max(nextStart, Math.min(frameLast, effectEnd));
                        if (activeEffect !== "none") {
                          bakeEffect(selected.id, activeEffect as AnimationPresetType, nextStart, nextEnd);
                        }
                      }}
                      className="h-7 rounded bg-black/20 border-white/10 text-[11px] font-bold text-white/80 focus-visible:ring-1 pr-1 pl-2 text-right focus-visible:ring-primary/40 focus-visible:bg-black/30 placeholder:text-white/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-white/40 block">End Fr.</Label>
                    <Input
                      type="number"
                      min={effectStart}
                      max={frameLast}
                      value={effectEnd}
                      disabled={selectedLocked}
                      onChange={(e) => {
                        const nextEnd = Math.max(effectStart, Math.min(frameLast, Number(e.target.value) || effectStart));
                        if ((activeEffect as string) !== "none") {
                          bakeEffect(selected.id, activeEffect as AnimationPresetType, effectStart, nextEnd);
                        }
                      }}
                      className="h-7 rounded bg-black/20 border-white/10 text-[11px] font-bold text-white/80 focus-visible:ring-1 pr-1 pl-2 text-right focus-visible:ring-primary/40 focus-visible:bg-black/30 placeholder:text-white/30"
                    />
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {overlays.length === 0 && state.frames.length > 0 && (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-white/[0.02] rounded-lg border border-white/5 border-dashed">
           <Type className="h-6 w-6 text-white/20 mb-2" />
           <p className="text-[11px] font-medium text-white/40">Click New Text Layer to begin</p>
        </div>
      )}
    </div>
  );
}
