"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Copy,
  GripVertical,
  Italic,
  Lock,
  Minus,
  Palette,
  Plus,
  RotateCcw,
  Trash2,
  Type,
} from "lucide-react";
import { useEditor } from "@/hooks/use-editor";
import { useOverlays } from "@/hooks/use-overlays";
import { cn } from "@/lib/utils";

interface ToolbarPos {
  x: number;
  y: number;
}

const VIEWPORT_MARGIN = 12;
const QUICK_COLORS = [
  "#ffffff",
  "#f5f5f5",
  "#94a3b8",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#f472b6",
] as const;

function getDefaultPos(): ToolbarPos {
  if (typeof window === "undefined") return { x: 24, y: 16 };
  return {
    x: Math.max(VIEWPORT_MARGIN, window.innerWidth / 2 - 280),
    y: 16,
  };
}

function clampToolbarPos(pos: ToolbarPos, width: number, height: number): ToolbarPos {
  if (typeof window === "undefined") return pos;
  return {
    x: Math.max(VIEWPORT_MARGIN, Math.min(pos.x, window.innerWidth - width - VIEWPORT_MARGIN)),
    y: Math.max(VIEWPORT_MARGIN, Math.min(pos.y, window.innerHeight - height - VIEWPORT_MARGIN)),
  };
}

function ToolbarBtn({
  active,
  pressed,
  danger,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  pressed?: boolean;
  danger?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-black/40",
        "text-zinc-200 border-transparent hover:text-white hover:border-white/20 hover:bg-white/10 active:scale-[0.97]",
        active && "text-primary border-primary/40 bg-primary/15 shadow-[0_0_0_1px_rgba(59,130,246,0.15)_inset]",
        danger && "hover:border-red-400/35 hover:bg-red-500/15 hover:text-red-200",
        disabled && "opacity-40 hover:bg-transparent hover:border-transparent hover:text-zinc-200 cursor-not-allowed active:scale-100"
      )}
    >
      {children}
    </button>
  );
}

function Group({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl border border-white/10 bg-black/20 px-1 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FloatingTextToolbar() {
  const { state } = useEditor();
  const { overlays, updateOverlay, removeOverlay, duplicateOverlay } = useOverlays();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  const selectedOverlay = overlays.find((o) => o.id === state.selectedOverlayId) ?? null;
  const [pos, setPos] = useState<ToolbarPos>(getDefaultPos);
  const posRef = useRef(pos);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const gripDragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  const syncPos = useCallback((nextPos: ToolbarPos) => {
    const rect = rootRef.current?.getBoundingClientRect();
    const clamped = clampToolbarPos(nextPos, rect?.width ?? 560, rect?.height ?? 58);
    posRef.current = clamped;
    setPos(clamped);
  }, []);

  const resetToolbarPos = useCallback(() => {
    syncPos(getDefaultPos());
  }, [syncPos]);

  useEffect(() => {
    const onResize = () => syncPos(posRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [syncPos]);

  useEffect(() => {
    if (!paletteOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target as Node)) setPaletteOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [paletteOpen]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const handleGripPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    gripDragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPosX: posRef.current.x,
      startPosY: posRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handleGripPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const drag = gripDragRef.current;
      if (!drag) return;
      syncPos({
        x: drag.startPosX + (e.clientX - drag.startClientX),
        y: drag.startPosY + (e.clientY - drag.startClientY),
      });
    },
    [syncPos]
  );

  const handleGripPointerUp = useCallback(() => {
    gripDragRef.current = null;
  }, []);

  if (!selectedOverlay) return null;

  const isBold = selectedOverlay.fontWeight === "bold";
  const isItalic = selectedOverlay.fontStyle === "italic";
  const isLocked = selectedOverlay.locked === true;
  const align = selectedOverlay.textAlign ?? "center";
  const color = selectedOverlay.color ?? "#ffffff";
  const fontSize = Math.max(6, Math.round(selectedOverlay.fontSize ?? 32));
  const fontName =
    selectedOverlay.fontFamily?.split(",")[0]?.replace(/['"]/g, "").trim() ?? "Font";
  const previewLabel = selectedOverlay.content?.trim()?.slice(0, 20) || "Text layer";

  const setAlign = (nextAlign: "left" | "center" | "right") => {
    if (isLocked) return;
    updateOverlay(selectedOverlay.id, { textAlign: nextAlign });
  };

  const toggleStyle = (key: "fontWeight" | "fontStyle") => {
    if (isLocked) return;
    if (key === "fontWeight") {
      updateOverlay(selectedOverlay.id, { fontWeight: isBold ? "normal" : "bold" });
      return;
    }
    updateOverlay(selectedOverlay.id, { fontStyle: isItalic ? "normal" : "italic" });
  };

  const setFontSize = (value: number) => {
    if (isLocked) return;
    updateOverlay(selectedOverlay.id, { fontSize: Math.max(6, Math.min(400, value)) });
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "fixed z-[140] flex max-w-[calc(100vw-24px)] items-center gap-2 overflow-visible rounded-2xl px-2.5 py-2 select-none",
        "border border-white/15 bg-[linear-gradient(145deg,rgba(10,14,24,0.96),rgba(18,24,36,0.9))]",
        "backdrop-blur-xl shadow-[0_16px_42px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]"
      )}
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

      <button
        type="button"
        title="Drag toolbar (double-click to reset position)"
        aria-label="Drag toolbar"
        onPointerDown={handleGripPointerDown}
        onPointerMove={handleGripPointerMove}
        onPointerUp={handleGripPointerUp}
        onDoubleClick={resetToolbarPos}
        className={cn(
          "inline-flex h-8 w-6 items-center justify-center rounded-lg text-zinc-400",
          "cursor-grab active:cursor-grabbing hover:bg-white/10 hover:text-zinc-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-black/40"
        )}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="hidden min-w-0 flex-col sm:flex">
        <span className="max-w-[130px] truncate text-[11px] font-medium leading-none text-zinc-100">
          {previewLabel}
        </span>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="max-w-[98px] truncate text-[10px] uppercase tracking-[0.12em] text-zinc-400">
            {fontName}
          </span>
          {isLocked && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-200">
              <Lock className="h-2.5 w-2.5" />
              Locked
            </span>
          )}
        </div>
      </div>

      <Group>
        <ToolbarBtn
          active={isBold}
          pressed={isBold}
          disabled={isLocked}
          title="Bold"
          onClick={() => toggleStyle("fontWeight")}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={isItalic}
          pressed={isItalic}
          disabled={isLocked}
          title="Italic"
          onClick={() => toggleStyle("fontStyle")}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </Group>

      <Group>
        <ToolbarBtn
          active={align === "left"}
          pressed={align === "left"}
          disabled={isLocked}
          title="Align left"
          onClick={() => setAlign("left")}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={align === "center"}
          pressed={align === "center"}
          disabled={isLocked}
          title="Align center"
          onClick={() => setAlign("center")}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={align === "right"}
          pressed={align === "right"}
          disabled={isLocked}
          title="Align right"
          onClick={() => setAlign("right")}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </Group>

      <Group className="gap-1.5 px-1.5">
        <Type className="h-3.5 w-3.5 text-zinc-400" />
        <button
          type="button"
          title="Decrease font size (Shift: -10)"
          aria-label="Decrease font size"
          disabled={isLocked}
          onClick={(e) => setFontSize(fontSize - (e.shiftKey ? 10 : 1))}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="number"
          min={6}
          max={400}
          step={1}
          title="Font size"
          aria-label="Font size"
          value={fontSize}
          disabled={isLocked}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (!Number.isNaN(next)) setFontSize(next);
          }}
          className={cn(
            "h-7 w-12 rounded-md border border-white/20 bg-black/25 px-1 text-center text-xs tabular-nums text-zinc-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        />
        <button
          type="button"
          title="Increase font size (Shift: +10)"
          aria-label="Increase font size"
          disabled={isLocked}
          onClick={(e) => setFontSize(fontSize + (e.shiftKey ? 10 : 1))}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </Group>

      <div className="relative">
        <button
          type="button"
          title="Text color"
          aria-label="Text color"
          disabled={isLocked}
          onClick={() => setPaletteOpen((v) => !v)}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-black/20",
            "hover:border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          <Palette className="h-3.5 w-3.5 text-zinc-200" />
          <span
            className="absolute bottom-1 h-1 w-4 rounded-full border border-white/15"
            style={{ backgroundColor: color }}
          />
        </button>
        <input
          ref={colorInputRef}
          type="color"
          className="sr-only"
          tabIndex={-1}
          value={color}
          onChange={(e) => updateOverlay(selectedOverlay.id, { color: e.target.value })}
        />
        {paletteOpen && (
          <div
            role="dialog"
            aria-label="Text color palette"
            className={cn(
              "absolute left-1/2 top-[calc(100%+8px)] z-[160] -translate-x-1/2 rounded-xl border border-white/15 bg-[#0b1220]/95 p-2 backdrop-blur-xl",
              "shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
            )}
          >
            <div className="mb-2 grid grid-cols-4 gap-1.5">
              {QUICK_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Set color ${swatch}`}
                  onClick={() => {
                    updateOverlay(selectedOverlay.id, { color: swatch });
                    setPaletteOpen(false);
                  }}
                  className={cn(
                    "h-5 w-5 rounded-md border transition-transform hover:scale-105",
                    swatch.toLowerCase() === color.toLowerCase()
                      ? "border-primary ring-2 ring-primary/35"
                      : "border-white/20"
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => colorInputRef.current?.click()}
              className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-zinc-200 hover:bg-white/10"
            >
              <Palette className="h-3 w-3" />
              Custom color
            </button>
          </div>
        )}
      </div>

      <Group>
        <ToolbarBtn title="Duplicate layer" onClick={() => duplicateOverlay(selectedOverlay.id)}>
          <Copy className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Reset toolbar position" onClick={resetToolbarPos}>
          <RotateCcw className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          danger
          disabled={isLocked}
          title="Delete layer"
          onClick={() => removeOverlay(selectedOverlay.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </Group>
    </div>
  );
}
