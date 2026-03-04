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

function getDefaultPos(): ToolbarPos {
  if (typeof window === "undefined") return { x: 0, y: 16 };
  return { x: Math.max(0, window.innerWidth / 2 - 176), y: 16 };
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
        "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ease-out active:scale-[0.97]",
        "text-white/60 hover:text-white hover:bg-white/10",
        active && "bg-primary/20 text-primary",
        danger && "hover:bg-destructive/20 hover:text-destructive"
      )}
    >
      {children}
    </button>
  );
}

// ─── Separator ────────────────────────────────────────────────────────────────

function Sep() {
  return <div className="h-5 w-px bg-white/10 mx-0.5" />;
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
        x: Math.max(0, Math.min(posRef.current.x, window.innerWidth - 352)),
        y: Math.max(0, Math.min(posRef.current.y, window.innerHeight - 60)),
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
      className="fixed z-[100] flex h-10 items-center gap-0.5 px-2 rounded-2xl bg-[#1a1c23]/95 backdrop-blur-xl border border-white/10 shadow-2xl select-none"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Grip */}
      <div
        className="flex items-center justify-center h-8 w-5 mr-0.5 text-white/25 hover:text-white/50 cursor-grab active:cursor-grabbing rounded-lg transition-colors"
        onPointerDown={handleGripPointerDown}
        onPointerMove={handleGripPointerMove}
        onPointerUp={handleGripPointerUp}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Font name */}
      <span className="text-[10px] text-white/40 max-w-[72px] truncate pr-1 hidden sm:block">
        {fontName}
      </span>

      <Sep />

      {/* Bold / Italic */}
      <ToolbarBtn active={isBold} onClick={() => toggle("fontWeight")} title="Bold">
        <Bold className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn active={isItalic} onClick={() => toggle("fontStyle")} title="Italic">
        <Italic className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <Sep />

      {/* Color swatch */}
      <div className="relative">
        <button
          type="button"
          title="Text color"
          onClick={() => {
            setColorOpen((v) => !v);
            colorInputRef.current?.click();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
        >
          <span
            className="h-4 w-4 rounded-sm border border-white/20 shadow-sm"
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
        className="h-8 w-12 rounded-lg border border-white/10 bg-white/5 px-1.5 text-center text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-primary/50"
        title="Font size"
      />

      <Sep />

      {/* Alignment */}
      <ToolbarBtn active={align === "left"} onClick={() => setAlign("left")} title="Align left">
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn active={align === "center"} onClick={() => setAlign("center")} title="Align center">
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn active={align === "right"} onClick={() => setAlign("right")} title="Align right">
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <Sep />

      {/* Duplicate */}
      <ToolbarBtn onClick={() => duplicateOverlay(selectedOverlay.id)} title="Duplicate">
        <Copy className="h-3.5 w-3.5" />
      </ToolbarBtn>

      {/* Delete */}
      <ToolbarBtn
        danger
        onClick={() => removeOverlay(selectedOverlay.id)}
        title="Delete overlay"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </ToolbarBtn>
    </div>
  );
}
