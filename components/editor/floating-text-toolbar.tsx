"use client";

/**
 * FloatingTextToolbar — a draggable mini-toolbar that appears when a text overlay is selected.
 * Import and render this component in editor-shell.tsx (or it is already rendered via overlay-renderer.tsx).
 */

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Trash2,
  GripVertical,
} from "lucide-react";
import { useEditor } from "@/hooks/use-editor";
import { useOverlays } from "@/hooks/use-overlays";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolbarPos {
  x: number;
  y: number;
}

const TOOLBAR_WIDTH = 396;
const TOOLBAR_HEIGHT = 56;

function getDefaultPos(): ToolbarPos {
  if (typeof window === "undefined") return { x: 0, y: 16 };
  return { x: Math.max(0, window.innerWidth / 2 - TOOLBAR_WIDTH / 2), y: 16 };
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

function ToolbarBtn({
  active,
  danger,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg border border-transparent transition-all duration-150 ease-out active:scale-[0.97]",
        "text-white/68 hover:border-white/20 hover:bg-white/[0.09] hover:text-white",
        active &&
          "border-primary/45 bg-primary/15 text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22)]",
        danger &&
          "hover:border-destructive/48 hover:bg-destructive/14 hover:text-destructive"
      )}
    >
      {children}
    </button>
  );
}

// ─── Separator ────────────────────────────────────────────────────────────────

function Sep() {
  return <div className="mx-0.5 h-6 w-px bg-white/10" />;
}

function ControlGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-white/12 bg-white/[0.035] px-1 py-0.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)]">
      {children}
    </div>
  );
}

// ─── FloatingTextToolbar ──────────────────────────────────────────────────────

export function FloatingTextToolbar() {
  const { state } = useEditor();
  const { overlays, updateOverlay, removeOverlay, duplicateOverlay } = useOverlays();

  const { selectedOverlayId } = state;
  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId) ?? null;

  const [pos, setPos] = useState<ToolbarPos>(getDefaultPos);
  const posRef = useRef<ToolbarPos>(getDefaultPos());
  const [colorOpen, setColorOpen] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Keep posRef in sync with pos state
  const setPosSynced = useCallback((newPos: ToolbarPos) => {
    posRef.current = newPos;
    setPos(newPos);
  }, []);

  // Dragging state
  const gripDragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  const handleGripPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      gripDragRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPosX: posRef.current.x,
        startPosY: posRef.current.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [] // no pos dependency — reads posRef.current directly
  );

  const handleGripPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = gripDragRef.current;
    if (!drag) return;
    const newX = drag.startPosX + (e.clientX - drag.startClientX);
    const newY = drag.startPosY + (e.clientY - drag.startClientY);
    setPosSynced({
      x: Math.max(0, newX),
      y: Math.max(0, newY),
    });
  }, [setPosSynced]);

  const handleGripPointerUp = useCallback(() => {
    gripDragRef.current = null;
  }, []);

  // Clamp position when window resizes
  useEffect(() => {
    const onResize = () => {
      setPosSynced({
        x: Math.max(0, Math.min(posRef.current.x, window.innerWidth - TOOLBAR_WIDTH)),
        y: Math.max(0, Math.min(posRef.current.y, window.innerHeight - TOOLBAR_HEIGHT)),
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setPosSynced]);

  // Close color popover on outside click
  useEffect(() => {
    if (!colorOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (colorInputRef.current && !colorInputRef.current.contains(target)) {
        setColorOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [colorOpen]);

  if (!selectedOverlay) return null;

  const isBold = selectedOverlay.fontWeight === "bold";
  const isItalic = selectedOverlay.fontStyle === "italic";
  const align = selectedOverlay.textAlign ?? "center";
  const color = selectedOverlay.color ?? "#ffffff";
  const fontSize = selectedOverlay.fontSize ?? 32;

  // Extract a human-readable font name from the fontFamily string
  const fontName =
    selectedOverlay.fontFamily
      ?.split(",")[0]
      ?.replace(/['"]/g, "")
      ?.trim() ?? "Font";

  const toggle = (field: "fontWeight" | "fontStyle") => {
    if (field === "fontWeight") {
      updateOverlay(selectedOverlay.id, { fontWeight: isBold ? "normal" : "bold" });
    } else {
      updateOverlay(selectedOverlay.id, { fontStyle: isItalic ? "normal" : "italic" });
    }
  };

  const setAlign = (a: "left" | "center" | "right") => {
    updateOverlay(selectedOverlay.id, { textAlign: a });
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateOverlay(selectedOverlay.id, { color: e.target.value });
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v > 0) {
      updateOverlay(selectedOverlay.id, { fontSize: v });
    }
  };

  return (
    <div
      className="fixed z-[100] flex items-center gap-1.5 rounded-2xl border border-white/16 bg-slate-950/60 p-1.5 text-white shadow-[0_20px_46px_-30px_rgba(2,6,23,0.9),0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-2xl supports-[backdrop-filter]:bg-slate-950/50 select-none"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/14"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent"
      />

      {/* Grip */}
      <ControlGroup>
        <div
          className="flex h-8 w-5 cursor-grab items-center justify-center rounded-lg text-white/30 transition-colors hover:text-white/62 active:cursor-grabbing"
          onPointerDown={handleGripPointerDown}
          onPointerMove={handleGripPointerMove}
          onPointerUp={handleGripPointerUp}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Font name */}
        <span className="hidden max-w-[72px] truncate pr-1 text-[10px] font-medium tracking-[0.02em] text-white/55 sm:block">
          {fontName}
        </span>
      </ControlGroup>

      <Sep />

      <ControlGroup>
        {/* Bold / Italic */}
        <ToolbarBtn active={isBold} onClick={() => toggle("fontWeight")} title="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={isItalic} onClick={() => toggle("fontStyle")} title="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarBtn>
      </ControlGroup>

      <Sep />

      <ControlGroup>
        {/* Color swatch */}
        <div className="relative">
          <button
            type="button"
            title="Text color"
            onClick={() => {
              setColorOpen((v) => !v);
              colorInputRef.current?.click();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] transition-colors hover:border-white/20 hover:bg-white/12"
          >
            <span
              className="h-4 w-4 rounded border border-white/30 shadow-sm"
              style={{ background: color }}
            />
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={color}
            onChange={handleColorChange}
            className="sr-only"
            tabIndex={-1}
          />
        </div>

        {/* Font size */}
        <input
          type="number"
          min={6}
          max={400}
          step={1}
          value={Math.round(fontSize)}
          onChange={handleFontSizeChange}
          className="h-8 w-12 rounded-lg border border-white/14 bg-black/22 px-1.5 text-center text-[11px] font-medium text-white/86 [appearance:textfield] focus:outline-none focus:ring-1 focus:ring-primary/45 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          title="Font size"
        />
      </ControlGroup>

      <Sep />

      <ControlGroup>
        {/* Alignment */}
        <ToolbarBtn active={align === "left"} onClick={() => setAlign("left")} title="Align left">
          <AlignLeft className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={align === "center"}
          onClick={() => setAlign("center")}
          title="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={align === "right"}
          onClick={() => setAlign("right")}
          title="Align right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarBtn>
      </ControlGroup>

      <Sep />

      <ControlGroup>
        {/* Duplicate */}
        <ToolbarBtn onClick={() => duplicateOverlay(selectedOverlay.id)} title="Duplicate">
          <Copy className="h-4 w-4" />
        </ToolbarBtn>

        {/* Delete */}
        <ToolbarBtn
          danger
          onClick={() => removeOverlay(selectedOverlay.id)}
          title="Delete overlay"
        >
          <Trash2 className="h-4 w-4" />
        </ToolbarBtn>
      </ControlGroup>
    </div>
  );
}
