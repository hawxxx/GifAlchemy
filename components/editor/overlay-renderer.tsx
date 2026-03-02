"use client";

import { useMemo, useRef, useCallback } from "react";
import { useEditor } from "@/hooks/use-editor";
import { useOverlays } from "@/hooks/use-overlays";
import type { Overlay } from "@/core/domain/project";
import { cn } from "@/lib/utils";

// ─── Keyframe interpolation ───────────────────────────────────────────────────

interface InterpolatedState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

function interpolate(overlay: Overlay, frameIndex: number): InterpolatedState {
  const kfs = [...overlay.keyframes].sort((a, b) => a.frameIndex - b.frameIndex);
  if (kfs.length === 0) return { x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 1 };
  if (frameIndex <= kfs[0].frameIndex) return kfs[0];
  if (frameIndex >= kfs[kfs.length - 1].frameIndex) return kfs[kfs.length - 1];

  const prev = [...kfs].reverse().find((k) => k.frameIndex <= frameIndex)!;
  const next = kfs.find((k) => k.frameIndex > frameIndex)!;
  const t = (frameIndex - prev.frameIndex) / (next.frameIndex - prev.frameIndex);

  return {
    x: prev.x + (next.x - prev.x) * t,
    y: prev.y + (next.y - prev.y) * t,
    scale: prev.scale + (next.scale - prev.scale) * t,
    rotation: prev.rotation + (next.rotation - prev.rotation) * t,
    opacity: prev.opacity + (next.opacity - prev.opacity) * t,
  };
}

// ─── OverlayRenderer ─────────────────────────────────────────────────────────

export interface OverlayRendererProps {
  overlays: Overlay[];
  currentFrameIndex: number;
  frameCount: number;
  width: number;
  height: number;
}

export function OverlayRenderer({ overlays, currentFrameIndex }: OverlayRendererProps) {
  const { state, dispatch, contentInputRef } = useEditor();
  const { shiftPosition } = useOverlays();
  const { activeTool, selectedOverlayId } = state;
  const isTextMode = activeTool === "text";

  // Container ref — used to convert pixel deltas to normalised coordinates
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state stored in a ref to avoid stale closure issues in pointer handlers
  const dragState = useRef<{
    overlayId: string;
    lastClientX: number;
    lastClientY: number;
  } | null>(null);

  const interpolated = useMemo(
    () => overlays.map((o) => ({ overlay: o, ...interpolate(o, currentFrameIndex) })),
    [overlays, currentFrameIndex]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, overlay: Overlay) => {
      e.stopPropagation();
      dispatch({ type: "SELECT_OVERLAY", payload: overlay.id });
      dispatch({ type: "SET_TOOL", payload: "text" });
      if (isTextMode) {
        dragState.current = {
          overlayId: overlay.id,
          lastClientX: e.clientX,
          lastClientY: e.clientY,
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [isTextMode, dispatch]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent, overlay: Overlay) => {
      const drag = dragState.current;
      if (!drag || drag.overlayId !== overlay.id) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;

      // Compute pixel delta and convert to normalised [0..1] space
      const dx = (e.clientX - drag.lastClientX) / rect.width;
      const dy = (e.clientY - drag.lastClientY) / rect.height;

      // Update last position for the next move event
      drag.lastClientX = e.clientX;
      drag.lastClientY = e.clientY;

      // Shift ALL keyframes so the text moves across the whole animation
      shiftPosition(overlay.id, dx, dy);
    },
    [shiftPosition]
  );

  const handlePointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  const handleDoubleClick = useCallback(
    (overlay: Overlay) => {
      dispatch({ type: "SET_TOOL", payload: "text" });
      dispatch({ type: "SELECT_OVERLAY", payload: overlay.id });
      requestAnimationFrame(() => contentInputRef.current?.focus());
    },
    [dispatch, contentInputRef]
  );

  if (overlays.length === 0) return null;

  return (
    // absolute inset-0 fills the canvas container exactly; no explicit w/h needed
    <div ref={containerRef} className="absolute inset-0 overflow-visible">
      {interpolated.map(({ overlay, x, y, scale, rotation, opacity }) => {
        const isSelected = selectedOverlayId === overlay.id;

        return (
          <div
            key={overlay.id}
            className={cn(
              "absolute origin-center select-none whitespace-pre-wrap pointer-events-auto",
              isTextMode ? "cursor-move" : "cursor-pointer",
              isSelected && isTextMode
                ? "outline outline-2 outline-offset-2 outline-blue-400/80 rounded-sm"
                : ""
            )}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
              opacity,
              fontFamily: overlay.fontFamily,
              fontSize: overlay.fontSize,
              fontWeight: overlay.fontWeight ?? "normal",
              fontStyle: overlay.fontStyle ?? "normal",
              color: overlay.color,
              WebkitTextStroke:
                (overlay.strokeWidth ?? 0) > 0
                  ? `${overlay.strokeWidth}px ${overlay.strokeColor ?? "#000000"}`
                  : undefined,
            }}
            onPointerDown={(e) => handlePointerDown(e, overlay)}
            onPointerMove={(e) => handlePointerMove(e, overlay)}
            onPointerUp={handlePointerUp}
            onDoubleClick={() => handleDoubleClick(overlay)}
          >
            {overlay.content || " "}
          </div>
        );
      })}
    </div>
  );
}
