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
import { FontPicker } from "@/components/editor/font-picker";
import type { FontOption } from "@/components/editor/font-picker";

const FONT_OPTIONS: FontOption[] = [
  { id: "system-ui", label: "System UI", category: "system" },
  { id: "Georgia, serif", label: "Georgia", category: "system" },
  { id: "Arial, sans-serif", label: "Arial", category: "system" },
  { id: "'Times New Roman', serif", label: "Times New Roman", category: "system" },
  { id: "'Courier New', monospace", label: "Courier New", category: "system" },
  { id: "Impact, sans-serif", label: "Impact", category: "system" },
  { id: "Verdana, sans-serif", label: "Verdana", category: "system" },
  { id: "'Plus Jakarta Sans', sans-serif", label: "HK Modular", category: "google" },
  { id: "'Rock Salt', cursive", label: "Lava Pro Grunge", category: "google" },
  { id: "'Permanent Marker', cursive", label: "WC Mano Negra Bold", category: "google" },
  { id: "'Bebas Neue', sans-serif", label: "Bebas Neue", category: "google" },
  { id: "'Pacifico', cursive", label: "Pacifico", category: "google" },
  { id: "'Press Start 2P', monospace", label: "Press Start 2P", category: "google" },
  { id: "'Cinzel', serif", label: "Cinzel", category: "google" },
  { id: "'Righteous', sans-serif", label: "Righteous", category: "google" },
];

const COLORS_QUICK = ["#ffffff", "#000000", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];

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
        "relative flex flex-col items-center gap-1 rounded-lg border-2 p-1.5 transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 active:scale-[0.98]",
        selected
          ? "border-primary bg-primary/15 ring-2 ring-primary/30 shadow-sm"
          : "border-border bg-muted/40 hover:border-primary/40 hover:bg-muted/70 hover:shadow-sm active:bg-muted/90"
      )}
    >
      {selected && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
          ✓
        </span>
      )}
      {/* mini preview — typewriter needs overflow clip for clip-path */}
      <div className="flex h-9 w-full items-center justify-center overflow-hidden rounded-md bg-zinc-800">
        {isTypewriter ? (
          <span className="inline-flex items-end text-sm font-bold text-white select-none">
            <span
              className="inline-block overflow-hidden whitespace-nowrap"
              style={{ width: "0ch", animation: "ef-typewriter-steps 1.8s steps(2, end) infinite" }}
            >
              Aa
            </span>
            <span className="inline-block w-[0.12em] min-w-[2px] h-[1em] ml-px align-baseline bg-current animate-typewriter-cursor" />
          </span>
        ) : (
          <span
            className="text-sm font-bold text-white select-none"
            style={anim ? { animation: anim } : undefined}
          >
            Aa
          </span>
        )}
      </div>
      <span className={cn(
        "text-[10px] leading-none truncate w-full text-center",
        selected ? "text-primary font-bold" : "text-muted-foreground"
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
    <div className="space-y-4">
      <FontLoader />
      {/* Layer list */}
      {overlays.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Text layers
            </p>
            {hasMultiSelection && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">
                  {multiSelectedIds.length} selected
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => applyBatchVisibility(false)}
                >
                  Hide
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => applyBatchVisibility(true)}
                >
                  Show
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => applyBatchLock(true)}
                >
                  Lock
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => applyBatchLock(false)}
                >
                  Unlock
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                  onClick={removeBatch}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
          {overlays.map((overlay) => {
            const isPrimarySelected = (selectedOverlayId ?? overlays[0]?.id) === overlay.id;
            const isMultiSelected = multiSelectedSet.has(overlay.id);
            const isSelected = isPrimarySelected || isMultiSelected;
            return (
              <div
                key={overlay.id}
                className={cn(
                  "group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors duration-100",
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/50 text-muted-foreground",
                  overlay.locked && "opacity-70"
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
                    "shrink-0 p-0.5 rounded hover:bg-background/20 transition-opacity",
                    overlay.visible === false && "opacity-50"
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
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </button>
                <button
                  className={cn(
                    "shrink-0 p-0.5 rounded hover:bg-background/20 transition-opacity",
                    overlay.locked && "text-amber-500"
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
                <Type className="h-3 w-3 shrink-0" />
                <span className="text-xs truncate flex-1">{overlay.content || "Text"}</span>
                <button
                  className={cn(
                    "transition-opacity hover:text-foreground",
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
                    "transition-opacity",
                    isSelected
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                    overlay.locked
                      ? "cursor-not-allowed text-muted-foreground/40"
                      : "hover:text-destructive"
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
      )}

      {/* Add button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full rounded-lg gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary/60 transition-all duration-150 ease-out active:scale-[0.98]"
        onClick={() => addOverlay()}
        disabled={state.frames.length === 0}
      >
        <Plus className="h-4 w-4" />
        Add text layer
      </Button>

      {selected && (
        <div className="space-y-3 pt-1 border-t border-border/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Edit selected</p>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors",
                selectedLocked
                  ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              onClick={() =>
                updateOverlay(selected.id, {
                  locked: !selectedLocked,
                })
              }
            >
              {selectedLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              {selectedLocked ? "Locked" : "Unlocked"}
            </button>
          </div>
          {selectedLocked && (
            <p className="text-[11px] text-amber-600">
              Layer is locked. Unlock it to edit text, style, keyframes, or effects.
            </p>
          )}

          {/* Content */}
          <div>
            <Label className="text-xs">Content</Label>
            <Input
              ref={contentInputRef}
              value={selected.content}
              onChange={(e) => updateOverlay(selected.id, { content: e.target.value })}
              className="rounded-lg mt-1"
              placeholder="Enter text…"
              disabled={selectedLocked}
            />
          </div>

          {/* Font + style */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 min-w-0">
              <Label className="text-xs">Font</Label>
              <div className="mt-1">
                <FontPicker
                  value={selected.fontFamily}
                  onChange={(v) => updateOverlay(selected.id, { fontFamily: v })}
                  fonts={FONT_OPTIONS}
                  disabled={selectedLocked}
                />
              </div>
            </div>
            {/* Bold / Italic toggles */}
            <div className="flex gap-1 pb-0.5">
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
                  "h-9 w-9 flex items-center justify-center rounded-lg border text-sm font-bold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 active:scale-95",
                  selectedLocked && "cursor-not-allowed opacity-50",
                  selected.fontWeight === "bold"
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-input hover:bg-muted/60 hover:shadow-sm text-muted-foreground active:bg-muted/80"
                )}
              >
                <Bold className="h-4 w-4" />
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
                  "h-9 w-9 flex items-center justify-center rounded-lg border text-sm italic transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 active:scale-95",
                  selectedLocked && "cursor-not-allowed opacity-50",
                  selected.fontStyle === "italic"
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-input hover:bg-muted/60 hover:shadow-sm text-muted-foreground active:bg-muted/80"
                )}
              >
                <Italic className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Font size */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Size</Label>
              <input
                type="number"
                min={8}
                max={120}
                step={1}
                value={selected.fontSize}
                disabled={selectedLocked}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!isNaN(v) && v >= 8 && v <= 120) {
                    updateOverlay(selected.id, { fontSize: v });
                  }
                }}
                className="h-6 w-14 rounded-md border border-border/60 bg-muted/40 px-1.5 text-center text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
              />
            </div>
            <Slider
              value={[selected.fontSize]}
              min={8}
              max={120}
              step={1}
              disabled={selectedLocked}
              onValueChange={([v]) => updateOverlay(selected.id, { fontSize: v ?? 32 })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Line height</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{selectedLineHeight.toFixed(2)}</span>
            </div>
            <Slider
              value={[selectedLineHeight]}
              min={0.8}
              max={3}
              step={0.05}
              disabled={selectedLocked}
              onValueChange={([v]) => updateSelectedOverlay({ lineHeight: Number((v ?? 1.2).toFixed(2)) })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Letter spacing</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{selectedLetterSpacing.toFixed(1)}px</span>
            </div>
            <Slider
              value={[selectedLetterSpacing]}
              min={-8}
              max={24}
              step={0.5}
              disabled={selectedLocked}
              onValueChange={([v]) => updateSelectedOverlay({ letterSpacing: Number((v ?? 0).toFixed(1)) })}
            />
          </div>

          {/* Alignment */}
          <div>
            <Label className="text-xs mb-1 block">Alignment</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["left", "center", "right"] as const).map((align) => (
                <Button
                  key={align}
                  type="button"
                  variant={(selected.textAlign ?? "center") === align ? "default" : "outline"}
                  size="sm"
                  className="rounded-lg text-xs"
                  disabled={selectedLocked}
                  onClick={() => updateOverlay(selected.id, { textAlign: align })}
                >
                  {align}
                </Button>
              ))}
            </div>
          </div>

          {/* Text color */}
          <div>
            <Label className="text-xs">Text color</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={selected.color}
                onChange={(e) => updateOverlay(selected.id, { color: e.target.value })}
                className="w-8 h-8 rounded-lg border border-border cursor-pointer p-0.5 bg-transparent"
                disabled={selectedLocked}
              />
              <div className="flex gap-1.5">
                {COLORS_QUICK.map((c) => (
                  <button
                    key={c}
                    aria-label={c}
                    disabled={selectedLocked}
                    className={cn(
                      "w-6 h-6 rounded-md border-2 transition-all duration-150 hover:scale-110",
                      selectedLocked && "cursor-not-allowed opacity-60 hover:scale-100",
                      selected.color === c
                        ? "border-primary scale-110 shadow-sm"
                        : "border-border/60 hover:border-border"
                    )}
                    style={{ background: c }}
                    onClick={() => updateOverlay(selected.id, { color: c })}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-border/60 bg-background/50 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Fill style</Label>
              <div className="grid grid-cols-2 gap-1">
                {(["solid", "gradient"] as const).map((fillType) => (
                  <Button
                    key={fillType}
                    type="button"
                    size="sm"
                    variant={(selected.fillType ?? "solid") === fillType ? "default" : "outline"}
                    className="h-7 rounded-md px-2 text-[11px]"
                    disabled={selectedLocked}
                    onClick={() => updateSelectedOverlay({ fillType })}
                  >
                    {fillType}
                  </Button>
                ))}
              </div>
            </div>
            {(selected.fillType ?? "solid") === "gradient" ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">From</Label>
                  <input
                    type="color"
                    value={selected.gradientFrom ?? "#ffffff"}
                    disabled={selectedLocked}
                    onChange={(e) => updateSelectedOverlay({ gradientFrom: e.target.value })}
                    className="mt-1 h-8 w-full rounded-lg border border-border cursor-pointer bg-transparent p-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">To</Label>
                  <input
                    type="color"
                    value={selected.gradientTo ?? "#5B8CFF"}
                    disabled={selectedLocked}
                    onChange={(e) => updateSelectedOverlay({ gradientTo: e.target.value })}
                    className="mt-1 h-8 w-full rounded-lg border border-border cursor-pointer bg-transparent p-1"
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* Stroke */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Stroke</Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {selected.strokeWidth ?? 0}px
              </span>
            </div>
            <Slider
              value={[selected.strokeWidth ?? 0]}
              min={0}
              max={12}
              step={0.5}
              disabled={selectedLocked}
              onValueChange={([v]) => updateOverlay(selected.id, { strokeWidth: v ?? 0 })}
            />
            {(selected.strokeWidth ?? 0) > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Stroke color</Label>
                <input
                  type="color"
                  value={selected.strokeColor ?? "#000000"}
                  onChange={(e) => updateOverlay(selected.id, { strokeColor: e.target.value })}
                  className="w-7 h-7 rounded-md border border-border cursor-pointer p-0.5 bg-transparent"
                  disabled={selectedLocked}
                />
                <div className="flex gap-1.5">
                  {["#000000", "#ffffff", "#ef4444", "#3b82f6"].map((c) => (
                    <button
                      key={c}
                      aria-label={c}
                      disabled={selectedLocked}
                      className={cn(
                        "w-6 h-6 rounded-md border-2 transition-all duration-150 hover:scale-110",
                        selectedLocked && "cursor-not-allowed opacity-60 hover:scale-100",
                        (selected.strokeColor ?? "#000000") === c
                          ? "border-primary scale-110 shadow-sm"
                          : "border-border/60 hover:border-border"
                      )}
                      style={{ background: c }}
                      onClick={() => updateOverlay(selected.id, { strokeColor: c })}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-border/60 bg-background/50 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Shadow</Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {selected.textShadowBlur ?? 0}px
              </span>
            </div>
            <Slider
              value={[selected.textShadowBlur ?? 0]}
              min={0}
              max={32}
              step={1}
              disabled={selectedLocked}
              onValueChange={([v]) => updateSelectedOverlay({ textShadowBlur: v ?? 0 })}
            />
            {(selected.textShadowBlur ?? 0) > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-[11px] text-muted-foreground">Shadow color</Label>
                <input
                  type="color"
                  value={selected.textShadowColor ?? "#000000"}
                  onChange={(e) => updateSelectedOverlay({ textShadowColor: e.target.value })}
                  className="h-7 w-9 rounded-md border border-border cursor-pointer bg-transparent p-0.5"
                  disabled={selectedLocked}
                />
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-border/60 bg-background/50 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Background chip</Label>
              <span className="text-xs text-muted-foreground">
                {(selected.backgroundColor ?? "#00000000") === "#00000000" ? "Off" : "On"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(selected.backgroundColor && selected.backgroundColor !== "#00000000")
                  ? selected.backgroundColor
                  : "#10141A"}
                onChange={(e) => updateSelectedOverlay({ backgroundColor: e.target.value })}
                className="h-8 w-10 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                disabled={selectedLocked}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-md px-2 text-[11px]"
                disabled={selectedLocked}
                onClick={() =>
                  updateSelectedOverlay({
                    backgroundColor:
                      (selected.backgroundColor ?? "#00000000") === "#00000000" ? "#10141A" : "#00000000",
                    backgroundPaddingX: (selected.backgroundPaddingX ?? 0) || 14,
                    backgroundPaddingY: (selected.backgroundPaddingY ?? 0) || 8,
                    backgroundRadius: (selected.backgroundRadius ?? 0) || 12,
                  })
                }
              >
                {(selected.backgroundColor ?? "#00000000") === "#00000000" ? "Enable" : "Disable"}
              </Button>
            </div>
          </div>

          {/* Text effects grid */}
          <div>
            <Label className="text-xs mb-2 block">Text effect</Label>
            <div className="grid grid-cols-3 gap-1.5">
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
            {activeEffect !== "none" && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Start frame</Label>
                  <Input
                    type="number"
                    min={0}
                    max={frameLast}
                    value={effectStart}
                    disabled={selectedLocked}
                    onChange={(e) => {
                      const nextStart = Math.max(0, Math.min(frameLast, Number(e.target.value) || 0));
                      const nextEnd = Math.max(nextStart, Math.min(frameLast, effectEnd));
                      bakeEffect(selected.id, activeEffect as AnimationPresetType, nextStart, nextEnd);
                    }}
                    className="mt-1 rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">End frame</Label>
                  <Input
                    type="number"
                    min={effectStart}
                    max={frameLast}
                    value={effectEnd}
                    disabled={selectedLocked}
                    onChange={(e) => {
                      const nextEnd = Math.max(effectStart, Math.min(frameLast, Number(e.target.value) || effectStart));
                      bakeEffect(selected.id, activeEffect as AnimationPresetType, effectStart, nextEnd);
                    }}
                    className="mt-1 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 rounded-lg gap-2"
              onClick={() => duplicateOverlay(selected.id)}
              disabled={selectedLocked}
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
              onClick={() => removeOverlay(selected.id)}
              disabled={selectedLocked}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        </div>
      )}

      {overlays.length === 0 && state.frames.length > 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Click Add text layer to start
        </p>
      )}
    </div>
  );
}
