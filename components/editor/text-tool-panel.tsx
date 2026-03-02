"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Type, Bold, Italic } from "lucide-react";
import { useOverlays } from "@/hooks/use-overlays";
import { useEditor } from "@/hooks/use-editor";
import { ANIMATION_PRESETS } from "@/core/domain/presets";
import type { AnimationPresetType } from "@/core/domain/project";
import { cn } from "@/lib/utils";

const FONT_OPTIONS = [
  { id: "system-ui", label: "System" },
  { id: "Georgia, serif", label: "Georgia" },
  { id: "Arial, sans-serif", label: "Arial" },
  { id: "'Times New Roman', serif", label: "Times New Roman" },
  { id: "'Courier New', monospace", label: "Courier" },
  { id: "Impact, sans-serif", label: "Impact" },
  { id: "Verdana, sans-serif", label: "Verdana" },
  { id: "'Comic Sans MS', cursive", label: "Comic Sans" },
];

const COLORS_QUICK = ["#ffffff", "#000000", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];

/** CSS animation name per effect id. */
const EFFECT_ANIM: Record<string, string> = {
  "fade-in":    "ef-fade-in 1.8s ease-in-out infinite",
  "fade-out":   "ef-fade-out 1.8s ease-in-out infinite",
  "slide-up":   "ef-slide-up 1.8s ease-out infinite",
  "slide-down": "ef-slide-down 1.8s ease-in infinite",
  "pop":        "ef-pop 1.6s ease-out infinite",
  "bounce":     "ef-bounce 1.6s ease-out infinite",
  "shake":      "ef-shake 1.2s linear infinite",
  "wiggle":     "ef-wiggle 1.4s ease-in-out infinite",
  "pulse":      "ef-pulse 1.4s ease-in-out infinite",
  "typewriter": "ef-typewriter 1.8s ease-out infinite",
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
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center gap-1 rounded-lg border-2 p-1.5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/15 ring-2 ring-primary/30"
          : "border-border bg-muted/40 hover:border-primary/40 hover:bg-muted/70"
      )}
    >
      {selected && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
          ✓
        </span>
      )}
      {/* mini preview — typewriter needs overflow clip for clip-path */}
      <div className="flex h-8 w-full items-center justify-center overflow-hidden rounded-md bg-zinc-800">
        <span
          className={cn(
            "text-sm font-bold text-white select-none",
            isTypewriter && "block overflow-hidden"
          )}
          style={anim ? { animation: anim } : undefined}
        >
          Aa
        </span>
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
    bakeEffect,
    clearEffect,
  } = useOverlays();
  const { state, contentInputRef } = useEditor();

  const selected = overlays.find((o) => o.id === selectedOverlayId) ?? overlays[0] ?? null;
  const activeEffect = selected?.effects[0]?.type ?? "none";

  return (
    <div className="space-y-4">
      {/* Layer list */}
      {overlays.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
            Text layers
          </p>
          {overlays.map((overlay) => {
            const isSelected = (selectedOverlayId ?? overlays[0]?.id) === overlay.id;
            return (
              <div
                key={overlay.id}
                className={cn(
                  "group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors duration-100",
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/50 text-muted-foreground"
                )}
                onClick={() => selectOverlay(overlay.id)}
              >
                <Type className="h-3 w-3 shrink-0" />
                <span className="text-xs truncate flex-1">{overlay.content || "Text"}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOverlay(overlay.id);
                  }}
                  aria-label="Remove"
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
        className="w-full rounded-lg gap-2"
        onClick={addOverlay}
        disabled={state.frames.length === 0}
      >
        <Plus className="h-3.5 w-3.5" />
        Add text layer
      </Button>

      {selected && (
        <div className="space-y-3 pt-1 border-t border-border/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Edit selected</p>

          {/* Content */}
          <div>
            <Label className="text-xs">Content</Label>
            <Input
              ref={contentInputRef}
              value={selected.content}
              onChange={(e) => updateOverlay(selected.id, { content: e.target.value })}
              className="rounded-lg mt-1"
              placeholder="Enter text…"
            />
          </div>

          {/* Font + style */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 min-w-0">
              <Label className="text-xs">Font</Label>
              <Select
                value={selected.fontFamily}
                onValueChange={(v) => updateOverlay(selected.id, { fontFamily: v })}
              >
                <SelectTrigger className="mt-1 h-10 gap-2">
                  <SelectValue>
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="flex h-6 w-7 shrink-0 items-center justify-center rounded bg-muted/60 text-xs font-semibold"
                        style={{ fontFamily: selected.fontFamily }}
                      >
                        Aa
                      </span>
                      <span
                        className="truncate text-sm"
                        style={{ fontFamily: selected.fontFamily }}
                      >
                        {FONT_OPTIONS.find((f) => f.id === selected.fontFamily)?.label ?? selected.fontFamily}
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="min-w-[220px]" align="start">
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="py-2.5 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-7 w-8 items-center justify-center rounded bg-muted/60 text-sm font-semibold text-foreground shrink-0"
                          style={{ fontFamily: f.id }}
                        >
                          Aa
                        </span>
                        <span
                          className="text-sm truncate"
                          style={{ fontFamily: f.id }}
                        >
                          {f.label}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Bold / Italic toggles */}
            <div className="flex gap-1 pb-0.5">
              <button
                aria-label="Bold"
                onClick={() =>
                  updateOverlay(selected.id, {
                    fontWeight: selected.fontWeight === "bold" ? "normal" : "bold",
                  })
                }
                className={cn(
                  "h-9 w-9 flex items-center justify-center rounded-lg border text-sm font-bold transition-colors",
                  selected.fontWeight === "bold"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-muted/60 text-muted-foreground"
                )}
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                aria-label="Italic"
                onClick={() =>
                  updateOverlay(selected.id, {
                    fontStyle: selected.fontStyle === "italic" ? "normal" : "italic",
                  })
                }
                className={cn(
                  "h-9 w-9 flex items-center justify-center rounded-lg border text-sm italic transition-colors",
                  selected.fontStyle === "italic"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-muted/60 text-muted-foreground"
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
              <span className="text-xs text-muted-foreground tabular-nums">{selected.fontSize}px</span>
            </div>
            <Slider
              value={[selected.fontSize]}
              min={8}
              max={120}
              step={1}
              onValueChange={([v]) => updateOverlay(selected.id, { fontSize: v ?? 32 })}
            />
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
              />
              <div className="flex gap-1">
                {COLORS_QUICK.map((c) => (
                  <button
                    key={c}
                    aria-label={c}
                    className={cn(
                      "w-5 h-5 rounded-md border-2 transition-transform hover:scale-110",
                      selected.color === c ? "border-primary scale-110" : "border-border"
                    )}
                    style={{ background: c }}
                    onClick={() => updateOverlay(selected.id, { color: c })}
                  />
                ))}
              </div>
            </div>
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
                />
                <div className="flex gap-1">
                  {["#000000", "#ffffff", "#ef4444", "#3b82f6"].map((c) => (
                    <button
                      key={c}
                      aria-label={c}
                      className={cn(
                        "w-5 h-5 rounded-md border-2 transition-transform hover:scale-110",
                        (selected.strokeColor ?? "#000000") === c
                          ? "border-primary scale-110"
                          : "border-border"
                      )}
                      style={{ background: c }}
                      onClick={() => updateOverlay(selected.id, { strokeColor: c })}
                    />
                  ))}
                </div>
              </div>
            )}
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
                    if (p.id === "none") {
                      clearEffect(selected.id);
                    } else {
                      bakeEffect(
                        selected.id,
                        p.id as AnimationPresetType,
                        0,
                        Math.max(0, state.frames.length - 1)
                      );
                    }
                  }}
                />
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => removeOverlay(selected.id)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Remove layer
          </Button>
        </div>
      )}

      {overlays.length === 0 && state.frames.length > 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Click "Add text layer" to start
        </p>
      )}
    </div>
  );
}
