"use client";

import { useMemo, useRef, useCallback, type MouseEvent } from "react";
import { useEditor } from "@/hooks/use-editor";
import { useOverlays } from "@/hooks/use-overlays";
import type { Overlay } from "@/core/domain/project";
import { cn } from "@/lib/utils";

function splitGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return Array.from(text);
}

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

  /** For typewriter effect: progress 0..1 over effect range for stepped, per-character reveal. */
  const getTypewriterProgress = useCallback((overlay: Overlay) => {
    const effect = overlay.effects[0];
    if (effect?.type !== "typewriter") return null;
    const duration = effect.endFrame - effect.startFrame;
    if (duration <= 0) return 1;
    const t = (currentFrameIndex - effect.startFrame) / duration;
    return Math.max(0, Math.min(1, t));
  }, [currentFrameIndex]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, overlay: Overlay) => {
      e.stopPropagation();
      dispatch({ type: "SELECT_OVERLAY", payload: overlay.id });
      dispatch({ type: "SET_TOOL", payload: "text" });
      if (isTextMode && overlay.locked !== true) {
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
      if (!drag || drag.overlayId !== overlay.id || overlay.locked === true) return;

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

  const focusContentInput = useCallback(() => {
    // Retry focus a few frames because the text panel/input mounts after tool switch.
    let tries = 0;
    const tryFocus = () => {
      const input = contentInputRef.current;
      if (input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
        return;
      }
      tries += 1;
      if (tries < 6) requestAnimationFrame(tryFocus);
    };
    requestAnimationFrame(tryFocus);
  }, [contentInputRef]);

  const handleDoubleClick = useCallback(
    (e: MouseEvent, overlay: Overlay) => {
      e.preventDefault();
      e.stopPropagation();
      dragState.current = null;
      dispatch({ type: "SET_TOOL", payload: "text" });
      dispatch({ type: "SELECT_OVERLAY", payload: overlay.id });
      focusContentInput();
    },
    [dispatch, focusContentInput]
  );

  const visibleOverlays = interpolated.filter(({ overlay }) => overlay.visible !== false);
  if (visibleOverlays.length === 0) return null;

  return (
    // absolute inset-0 fills the canvas container exactly; no explicit w/h needed
    <div ref={containerRef} className="absolute inset-0 overflow-visible">
      {visibleOverlays.map(({ overlay, x, y, scale, rotation, opacity }) => {
        const isSelected = selectedOverlayId === overlay.id;
        const typewriterT = getTypewriterProgress(overlay);
        const isTypewriter = typewriterT !== null;
        const content = overlay.content || " ";
        const graphemes = splitGraphemes(content);
        const typedChars = isTypewriter
          ? Math.floor(typewriterT * graphemes.length)
          : graphemes.length;
        const visibleContent = isTypewriter
          ? graphemes.slice(0, typedChars).join("")
          : content;
        const showCursor = isTypewriter && typewriterT < 1;

        return (
          <div
            key={overlay.id}
            className={cn(
              "absolute origin-center select-none whitespace-pre-wrap pointer-events-auto",
              overlay.locked
                ? "cursor-not-allowed"
                : isTextMode
                  ? "cursor-move"
                  : "cursor-pointer",
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
              textAlign: overlay.textAlign ?? "center",
              color: overlay.color,
              WebkitTextStroke:
                (overlay.strokeWidth ?? 0) > 0
                  ? `${overlay.strokeWidth}px ${overlay.strokeColor ?? "#000000"}`
                  : undefined,
            }}
            onPointerDown={(e) => handlePointerDown(e, overlay)}
            onPointerMove={(e) => handlePointerMove(e, overlay)}
            onPointerUp={handlePointerUp}
            onDoubleClick={(e) => handleDoubleClick(e, overlay)}
          >
            {isTypewriter ? (
              <span className="relative inline-block whitespace-pre">
                {/* Reserve full-width box so text does not "drift" while typing. */}
                <span className="invisible">{content}</span>
                <span className="absolute inset-0 whitespace-pre block" style={{ textAlign: overlay.textAlign ?? "center" }}>
                  {visibleContent || " "}
                  {showCursor && (
                    <span
                      className="inline-block w-[0.12em] min-w-[2px] h-[1em] ml-px align-baseline bg-current animate-typewriter-cursor"
                      aria-hidden
                    />
                  )}
                </span>
              </span>
            ) : (
              content
            )}
          </div>
        );
      })}
    </div>
  );
}
