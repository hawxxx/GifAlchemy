"use client";

import { useMemo, useRef, useCallback, useState, type MouseEvent, type CSSProperties } from "react";
import { useEditor } from "@/hooks/use-editor";
import type { Overlay, TypewriterCursorStyle } from "@/core/domain/project";
import { cn } from "@/lib/utils";

function splitGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return Array.from(text);
}

function transformContent(content: string, textTransform: Overlay["textTransform"]): string {
  if (textTransform === "uppercase") return content.toUpperCase();
  if (textTransform === "lowercase") return content.toLowerCase();
  return content;
}

// ─── Keyframe interpolation ───────────────────────────────────────────────────

interface InterpolatedState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

type SegmentEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out";
type KeyframeWithSegmentEasing = Overlay["keyframes"][number] & {
  easingToNext?: SegmentEasing;
};

function easeProgress(t: number, easing: "linear" | "ease-in" | "ease-out" | "ease-in-out"): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (easing === "linear") return clamped;
  if (easing === "ease-in") return clamped * clamped;
  if (easing === "ease-out") return 1 - (1 - clamped) * (1 - clamped);
  if (easing === "ease-in-out") {
    return clamped < 0.5
      ? 2 * clamped * clamped
      : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
  }
  return clamped;
}

function getCursorStyle(style: TypewriterCursorStyle): CSSProperties {
  if (style === "bar") {
    return {
      width: "0.08em",
      minWidth: "1px",
      height: "1em",
      marginLeft: "1px",
      verticalAlign: "baseline",
    };
  }
  if (style === "underscore") {
    return {
      width: "0.6em",
      minWidth: "3px",
      height: "0.08em",
      marginLeft: "1px",
      verticalAlign: "baseline",
      transform: "translateY(0.42em)",
    };
  }
  return {
    width: "0.12em",
    minWidth: "2px",
    height: "1em",
    marginLeft: "1px",
    verticalAlign: "baseline",
  };
}

function interpolate(overlay: Overlay, frameIndex: number): InterpolatedState {
  const kfs = [...overlay.keyframes].sort((a, b) => a.frameIndex - b.frameIndex) as KeyframeWithSegmentEasing[];
  if (kfs.length === 0) return { x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 1 };
  if (frameIndex <= kfs[0].frameIndex) return kfs[0];
  if (frameIndex >= kfs[kfs.length - 1].frameIndex) return kfs[kfs.length - 1];

  const prev = [...kfs].reverse().find((k) => k.frameIndex <= frameIndex)!;
  const next = kfs.find((k) => k.frameIndex > frameIndex)!;
  const tRaw = (frameIndex - prev.frameIndex) / (next.frameIndex - prev.frameIndex);
  const t = easeProgress(tRaw, prev.easingToNext ?? "linear");

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
  const { activeTool, selectedOverlayId } = state;
  const isTextMode = activeTool === "text";

  // Container ref — used to convert pixel deltas to normalised coordinates
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state stored in a ref to avoid stale closure issues in pointer handlers
  const dragState = useRef<{
    overlayId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    baseKeyframes: Overlay["keyframes"];
  } | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ vertical?: number; horizontal?: number } | null>(
    null
  );

  const interpolated = useMemo(
    () => overlays.map((o) => ({ overlay: o, ...interpolate(o, currentFrameIndex) })),
    [overlays, currentFrameIndex]
  );

  const frameStartsMs = useMemo(() => {
    const starts = new Array(state.frames.length);
    let elapsed = 0;
    for (let i = 0; i < state.frames.length; i++) {
      starts[i] = elapsed;
      elapsed += Math.max(10, state.frames[i]?.delay ?? 100);
    }
    return starts;
  }, [state.frames]);

  const getTypewriterState = useCallback((overlay: Overlay) => {
    const effect = overlay.effects.slice(0, 2).find((fx) => fx.type === "typewriter");
    if (!effect) return null;

    const content = transformContent(overlay.content || " ", overlay.textTransform ?? "none");
    const graphemes = splitGraphemes(content);
    const totalChars = graphemes.length;
    if (totalChars === 0) {
      return { visibleContent: "", showCursor: false, cursorStyle: "bar" as TypewriterCursorStyle };
    }

    const maxFrame = Math.max(0, state.frames.length - 1);
    const startFrame = Math.max(0, Math.min(maxFrame, effect.startFrame));
    const endFrame = Math.max(startFrame, Math.min(maxFrame, effect.endFrame));

    if (currentFrameIndex <= startFrame) {
      return {
        visibleContent: "",
        showCursor: true,
        cursorStyle: effect.cursorStyle ?? "bar",
      };
    }
    if (currentFrameIndex >= endFrame) {
      return {
        visibleContent: content,
        showCursor: false,
        cursorStyle: effect.cursorStyle ?? "bar",
      };
    }

    const startMs = frameStartsMs[startFrame] ?? 0;
    const currentMs = frameStartsMs[currentFrameIndex] ?? startMs;
    const endMs = (frameStartsMs[endFrame] ?? startMs) + Math.max(10, state.frames[endFrame]?.delay ?? 100);
    const durationMs = Math.max(1, endMs - startMs);
    const elapsedMs = Math.max(0, currentMs - startMs);

    const t = elapsedMs / durationMs;
    const easedT = easeProgress(t, effect.easing ?? "ease-out");
    const autoCharsPerSecond = totalChars / Math.max(0.001, durationMs / 1000);
    const configuredCps = effect.charsPerSecond ?? 12;
    const effectiveCps = Math.max(configuredCps, autoCharsPerSecond);
    const charsFromSpeed = Math.floor((elapsedMs / 1000) * effectiveCps);
    const charsFromTimeline = Math.floor(easedT * totalChars);
    const visibleCount = Math.max(0, Math.min(totalChars, Math.max(charsFromSpeed, charsFromTimeline)));
    const visibleContent = graphemes.slice(0, visibleCount).join("");
    const blinkOn = Math.floor(elapsedMs / 500) % 2 === 0;
    const showCursor = visibleCount < totalChars && blinkOn;

    return {
      visibleContent,
      showCursor,
      cursorStyle: effect.cursorStyle ?? "bar",
    };
  }, [currentFrameIndex, frameStartsMs, state.frames]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, overlay: Overlay) => {
      e.stopPropagation();
      dispatch({ type: "SELECT_OVERLAY", payload: overlay.id });
      dispatch({ type: "SET_TOOL", payload: "text" });
      if (isTextMode && overlay.locked !== true) {
        const start = interpolate(overlay, currentFrameIndex);
        dragState.current = {
          overlayId: overlay.id,
          startClientX: e.clientX,
          startClientY: e.clientY,
          startX: start.x,
          startY: start.y,
          baseKeyframes: overlay.keyframes.map((k) => ({ ...k })),
        };
        setSnapGuides(null);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [isTextMode, dispatch, currentFrameIndex]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent, overlay: Overlay) => {
      const drag = dragState.current;
      if (!drag || drag.overlayId !== overlay.id || overlay.locked === true) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;

      const dxNorm = (e.clientX - drag.startClientX) / rect.width;
      const dyNorm = (e.clientY - drag.startClientY) / rect.height;
      const rawX = drag.startX + dxNorm;
      const rawY = drag.startY + dyNorm;

      const thresholdX = 8 / rect.width;
      const thresholdY = 8 / rect.height;
      const guideCandidatesX: number[] = [0.5];
      const guideCandidatesY: number[] = [0.5];
      for (const other of overlays) {
        if (other.id === overlay.id || other.visible === false) continue;
        const point = interpolate(other, currentFrameIndex);
        guideCandidatesX.push(point.x);
        guideCandidatesY.push(point.y);
      }

      let snappedX = rawX;
      let snappedY = rawY;
      let guideX: number | undefined;
      let guideY: number | undefined;
      for (const candidate of guideCandidatesX) {
        if (Math.abs(rawX - candidate) <= thresholdX) {
          snappedX = candidate;
          guideX = candidate;
          break;
        }
      }
      for (const candidate of guideCandidatesY) {
        if (Math.abs(rawY - candidate) <= thresholdY) {
          snappedY = candidate;
          guideY = candidate;
          break;
        }
      }

      setSnapGuides(
        guideX !== undefined || guideY !== undefined
          ? { vertical: guideX, horizontal: guideY }
          : null
      );

      const deltaX = snappedX - drag.startX;
      const deltaY = snappedY - drag.startY;
      const keyframes = drag.baseKeyframes.map((k) => ({
        ...k,
        x: Math.max(0, Math.min(1, k.x + deltaX)),
        y: Math.max(0, Math.min(1, k.y + deltaY)),
      }));
      dispatch({ type: "UPDATE_OVERLAY", payload: { id: overlay.id, updates: { keyframes } } });
    },
    [dispatch, overlays, currentFrameIndex]
  );

  const handlePointerUp = useCallback(() => {
    dragState.current = null;
    setSnapGuides(null);
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
      {snapGuides?.vertical !== undefined && (
        <div
          className="absolute top-0 bottom-0 w-px bg-sky-400/90 pointer-events-none z-[80]"
          style={{ left: `${snapGuides.vertical * 100}%` }}
        />
      )}
      {snapGuides?.horizontal !== undefined && (
        <div
          className="absolute left-0 right-0 h-px bg-sky-400/90 pointer-events-none z-[80]"
          style={{ top: `${snapGuides.horizontal * 100}%` }}
        />
      )}
      {visibleOverlays.map(({ overlay, x, y, scale, rotation, opacity }) => {
        const isSelected = selectedOverlayId === overlay.id;
        const typewriterState = getTypewriterState(overlay);
        const isTypewriter = typewriterState !== null;
        const content = transformContent(overlay.content || " ", overlay.textTransform ?? "none");
        const visibleContent = typewriterState?.visibleContent ?? content;
        const showCursor = typewriterState?.showCursor ?? false;
        const cursorStyle = typewriterState?.cursorStyle ?? "bar";
        const shadowColor = overlay.textShadowColor ?? "#000000";
        const shadowBlur = overlay.textShadowBlur ?? 0;
        const shadowOffsetX = overlay.textShadowOffsetX ?? 0;
        const shadowOffsetY = overlay.textShadowOffsetY ?? 0;
        const textShadow = `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`;
        const fillType = overlay.fillType ?? "solid";
        const gradientFrom = overlay.gradientFrom ?? "#ffffff";
        const gradientTo = overlay.gradientTo ?? "#3b82f6";
        const gradientAngle = overlay.gradientAngle ?? 90;
        const backgroundColor = overlay.backgroundColor ?? "#00000000";
        const backgroundPaddingX = overlay.backgroundPaddingX ?? 0;
        const backgroundPaddingY = overlay.backgroundPaddingY ?? 0;
        const backgroundRadius = overlay.backgroundRadius ?? 0;
        const textFillStyles =
          fillType === "gradient"
            ? {
                backgroundImage: `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`,
                WebkitBackgroundClip: "text" as const,
                backgroundClip: "text" as const,
                color: "transparent",
              }
            : { color: overlay.color };
        const textBoxStyles = {
          display: "inline-block",
          backgroundColor,
          padding: `${backgroundPaddingY}px ${backgroundPaddingX}px`,
          borderRadius: `${backgroundRadius}px`,
        };

        return (
          <div
            key={overlay.id}
            className={cn(
              "absolute origin-center select-none whitespace-pre-wrap",
              isTextMode ? "pointer-events-auto" : "pointer-events-none",
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
              ...textFillStyles,
              textShadow,
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
              <span className="relative inline-block whitespace-pre" style={textBoxStyles}>
                {/* Reserve full-width box so text does not "drift" while typing. */}
                <span className="invisible">{content}</span>
                <span className="absolute inset-0 whitespace-pre block" style={{ textAlign: overlay.textAlign ?? "center" }}>
                  {visibleContent || " "}
                  {showCursor && (
                    <span
                      className="inline-block animate-typewriter-cursor"
                      style={{ ...getCursorStyle(cursorStyle), backgroundColor: overlay.color }}
                      aria-hidden
                    />
                  )}
                </span>
              </span>
            ) : (
              <span style={textBoxStyles}>{content}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
