"use client";

import { useMemo, useRef, useCallback, useState, type MouseEvent, type CSSProperties } from "react";
import { useEditor } from "@/hooks/use-editor";
import type { Overlay, TypewriterCursorStyle } from "@/core/domain/project";
import { cn } from "@/lib/utils";
import { FloatingTextToolbar } from "./floating-text-toolbar";

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

// ─── Handle definitions ───────────────────────────────────────────────────────

const RESIZE_HANDLES = [
  { id: "nw", cursor: "nwse-resize", style: { top: 0, left: 0 },           tx: "-50%", ty: "-50%" },
  { id: "n",  cursor: "ns-resize",   style: { top: 0, left: "50%" },       tx: "-50%", ty: "-50%" },
  { id: "ne", cursor: "nesw-resize", style: { top: 0, right: 0 },          tx: "50%",  ty: "-50%" },
  { id: "w",  cursor: "ew-resize",   style: { top: "50%", left: 0 },       tx: "-50%", ty: "-50%" },
  { id: "e",  cursor: "ew-resize",   style: { top: "50%", right: 0 },      tx: "50%",  ty: "-50%" },
  { id: "sw", cursor: "nesw-resize", style: { bottom: 0, left: 0 },        tx: "-50%", ty: "50%"  },
  { id: "s",  cursor: "ns-resize",   style: { bottom: 0, left: "50%" },    tx: "-50%", ty: "50%"  },
  { id: "se", cursor: "nwse-resize", style: { bottom: 0, right: 0 },       tx: "50%",  ty: "50%"  },
] as const;

// ─── OverlayRenderer ─────────────────────────────────────────────────────────

export interface OverlayRendererProps {
  overlays: Overlay[];
  currentFrameIndex: number;
  frameCount: number;
  width: number;
  height: number;
}

export function OverlayRenderer({ overlays, currentFrameIndex }: OverlayRendererProps) {
  const { state, dispatch } = useEditor();
  const { activeTool, selectedOverlayId } = state;
  const isTextMode = activeTool === "text";

  // Container ref — used to convert pixel deltas to normalised coordinates
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state for overlay position
  const dragState = useRef<{
    overlayId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    baseKeyframes: Overlay["keyframes"];
  } | null>(null);

  // Drag state for resize handles
  const resizeDragRef = useRef<{
    overlayId: string;
    centerX: number;
    centerY: number;
    startDist: number;
    startScale: number;
    kfIndex: number;
    baseKeyframes: Overlay["keyframes"];
  } | null>(null);

  // Drag state for rotate handle
  const rotateDragRef = useRef<{
    overlayId: string;
    centerX: number;
    centerY: number;
    startAngle: number;
    startRotation: number;
    kfIndex: number;
    baseKeyframes: Overlay["keyframes"];
  } | null>(null);

  const [snapGuides, setSnapGuides] = useState<{ vertical?: number; horizontal?: number } | null>(
    null
  );
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  const clickStateRef = useRef<{
    overlayId: string;
    startClientX: number;
    startClientY: number;
    moved: boolean;
  } | null>(null);
  const CLICK_MOVE_THRESHOLD_PX = 4;

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

  // ─── Overlay drag handlers ──────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, overlay: Overlay) => {
      e.stopPropagation();
      if (editingOverlayId === overlay.id) return;
      clickStateRef.current = {
        overlayId: overlay.id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        moved: false,
      };
      dispatch({ type: "SELECT_OVERLAY", payload: overlay.id });
      dispatch({ type: "SET_TOOL", payload: "text" });
      if (overlay.locked !== true) {
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
    [dispatch, currentFrameIndex, editingOverlayId]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent, overlay: Overlay) => {
      const click = clickStateRef.current;
      if (click && click.overlayId === overlay.id && !click.moved) {
        if (
          Math.abs(e.clientX - click.startClientX) > CLICK_MOVE_THRESHOLD_PX ||
          Math.abs(e.clientY - click.startClientY) > CLICK_MOVE_THRESHOLD_PX
        ) {
          click.moved = true;
        }
      }

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

  const handleClick = useCallback(
    (e: MouseEvent, overlay: Overlay) => {
      e.stopPropagation();
      const click = clickStateRef.current;
      if (!click || click.overlayId !== overlay.id) return;
      clickStateRef.current = null;
      if (click.moved || overlay.locked) return;

      // First click selects, second click starts inline edit.
      if (selectedOverlayId === overlay.id) {
        setEditingOverlayId(overlay.id);
      }
    },
    [selectedOverlayId]
  );

  // ─── Resize handle handlers ─────────────────────────────────────────────────

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, overlay: Overlay, currentScale: number) => {
      e.stopPropagation();
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const st = interpolate(overlay, currentFrameIndex);
      const centerX = rect.left + st.x * rect.width;
      const centerY = rect.top + st.y * rect.height;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const startDist = Math.sqrt(dx * dx + dy * dy);
      if (startDist < 2) return;

      const kfs = [...overlay.keyframes].sort((a, b) => a.frameIndex - b.frameIndex);
      const exactIdx = kfs.findIndex((k) => k.frameIndex === currentFrameIndex);
      const kfIndex = exactIdx !== -1 ? exactIdx : 0;

      resizeDragRef.current = {
        overlayId: overlay.id,
        centerX,
        centerY,
        startDist,
        startScale: currentScale,
        kfIndex,
        baseKeyframes: overlay.keyframes.map((k) => ({ ...k })),
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [currentFrameIndex]
  );

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = resizeDragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.centerX;
      const dy = e.clientY - drag.centerY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.max(0.05, drag.startScale * (currentDist / drag.startDist));
      const keyframes = drag.baseKeyframes.map((k, i) =>
        i === drag.kfIndex ? { ...k, scale: newScale } : k
      );
      dispatch({ type: "UPDATE_OVERLAY", payload: { id: drag.overlayId, updates: { keyframes } } });
    },
    [dispatch]
  );

  const handleResizePointerUp = useCallback(() => {
    resizeDragRef.current = null;
  }, []);

  // ─── Rotate handle handlers ─────────────────────────────────────────────────

  const handleRotatePointerDown = useCallback(
    (e: React.PointerEvent, overlay: Overlay, currentRotation: number) => {
      e.stopPropagation();
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const st = interpolate(overlay, currentFrameIndex);
      const centerX = rect.left + st.x * rect.width;
      const centerY = rect.top + st.y * rect.height;

      const kfs = [...overlay.keyframes].sort((a, b) => a.frameIndex - b.frameIndex);
      const exactIdx = kfs.findIndex((k) => k.frameIndex === currentFrameIndex);
      const kfIndex = exactIdx !== -1 ? exactIdx : 0;

      rotateDragRef.current = {
        overlayId: overlay.id,
        centerX,
        centerY,
        startAngle: Math.atan2(e.clientY - centerY, e.clientX - centerX),
        startRotation: currentRotation,
        kfIndex,
        baseKeyframes: overlay.keyframes.map((k) => ({ ...k })),
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [currentFrameIndex]
  );

  const handleRotatePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = rotateDragRef.current;
      if (!drag) return;
      const currentAngle = Math.atan2(e.clientY - drag.centerY, e.clientX - drag.centerX);
      const deltaAngle = (currentAngle - drag.startAngle) * (180 / Math.PI);
      const newRotation = drag.startRotation + deltaAngle;
      const keyframes = drag.baseKeyframes.map((k, i) =>
        i === drag.kfIndex ? { ...k, rotation: newRotation } : k
      );
      dispatch({ type: "UPDATE_OVERLAY", payload: { id: drag.overlayId, updates: { keyframes } } });
    },
    [dispatch]
  );

  const handleRotatePointerUp = useCallback(() => {
    rotateDragRef.current = null;
  }, []);

  const handleDoubleClick = useCallback(
    (e: MouseEvent, overlay: Overlay) => {
      e.preventDefault();
      e.stopPropagation();
      dragState.current = null;
      dispatch({ type: "SET_TOOL", payload: "text" });
      dispatch({ type: "SELECT_OVERLAY", payload: overlay.id });
      setEditingOverlayId(overlay.id);
    },
    [dispatch]
  );

  const visibleOverlays = interpolated.filter(({ overlay }) => overlay.visible !== false);
  if (visibleOverlays.length === 0) return null;

  return (
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
        const showHandles = isSelected && isTextMode && !overlay.locked;
        const typewriterState = getTypewriterState(overlay);
        const isTypewriter = typewriterState !== null;
        const content = transformContent(overlay.content || " ", overlay.textTransform ?? "none");
        const visibleContent = typewriterState?.visibleContent ?? content;
        const showCursor = typewriterState?.showCursor ?? false;
        const cursorStyle = typewriterState?.cursorStyle ?? "bar";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ov = overlay as any;
        const shadowColor = ov.textShadowColor ?? "#000000";
        const shadowBlur = ov.textShadowBlur ?? 0;
        const shadowOffsetX = ov.textShadowOffsetX ?? 0;
        const shadowOffsetY = ov.textShadowOffsetY ?? 0;
        const textShadow = `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`;
        const fillType = ov.fillType ?? "solid";
        const gradientFrom = ov.gradientFrom ?? "#ffffff";
        const gradientTo = ov.gradientTo ?? "#3b82f6";
        const gradientAngle = ov.gradientAngle ?? 90;
        const backgroundColor = ov.backgroundColor ?? "#00000000";
        const backgroundPaddingX = ov.backgroundPaddingX ?? 0;
        const backgroundPaddingY = ov.backgroundPaddingY ?? 0;
        const backgroundRadius = ov.backgroundRadius ?? 0;
        const textFillStyles =
          fillType === "gradient"
            ? {
                backgroundImage: `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`,
                WebkitBackgroundClip: "text" as const,
                backgroundClip: "text" as const,
                color: "transparent",
              }
            : { color: overlay.color };

        const effectAnim: Record<string, string> = {
          "rainbow": "ef-rainbow 2s linear infinite",
          "neon-glow": "ef-neon-glow 1.5s ease-in-out infinite",
          "glitch": "ef-glitch 0.8s step-end infinite",
        };
        const activeEffectType = overlay.effects[0]?.type;
        const effectAnimation =
          activeEffectType && activeEffectType in effectAnim
            ? effectAnim[activeEffectType]
            : undefined;

        const textBoxStyles: CSSProperties = {
          display: "inline-block",
          backgroundColor,
          padding: `${backgroundPaddingY}px ${backgroundPaddingX}px`,
          borderRadius: `${backgroundRadius}px`,
          ...(fillType !== "gradient" && effectAnimation ? { animation: effectAnimation } : {}),
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
              showHandles
                ? "border-2 border-dashed border-blue-400/70 rounded-sm"
                : isSelected && isTextMode
                  ? "outline outline-2 outline-offset-2 outline-blue-400/80 rounded-sm"
                  : ""
            )}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
              opacity,
              minWidth: "8ch",
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
            onClick={(e) => handleClick(e, overlay)}
            onDoubleClick={(e) => handleDoubleClick(e, overlay)}
          >
            {editingOverlayId === overlay.id ? (
              <div
                contentEditable="true"
                suppressContentEditableWarning
                onPointerDown={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  const text = e.currentTarget.textContent ?? "";
                  dispatch({ type: "UPDATE_OVERLAY", payload: { id: overlay.id, updates: { content: text } } });
                  setEditingOverlayId(null);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Escape") {
                    setEditingOverlayId(null);
                  }
                }}
                onInput={(e) => {
                  const text = (e.currentTarget as HTMLDivElement).textContent ?? "";
                  dispatch({ type: "UPDATE_OVERLAY", payload: { id: overlay.id, updates: { content: text } } });
                }}
                ref={(el) => {
                  if (el && document.activeElement !== el) {
                    el.textContent = overlay.content;
                    el.focus();
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(el);
                    range.collapse(false);
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                  }
                }}
                style={{
                  outline: "none",
                  minWidth: "4ch",
                  minHeight: "1em",
                  cursor: "text",
                  userSelect: "text" as const,
                  whiteSpace: "pre-wrap",
                  textAlign: overlay.textAlign ?? "center",
                  background: "transparent",
                }}
              />
            ) : isTypewriter ? (
              <span className="relative inline-block whitespace-pre" style={textBoxStyles}>
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

            {showHandles && (
              <>
                {/* Connector line from top-center to rotate handle */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: 0,
                    left: "50%",
                    width: 1,
                    height: 28,
                    transform: "translate(-50%, -100%)",
                    background: "rgba(37, 99, 235, 0.9)",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.55)",
                  }}
                />
                {/* Rotate handle */}
                <div
                  className="absolute h-4 w-4 rounded-full bg-white border-2 border-blue-600 shadow-md z-[90] flex items-center justify-center"
                  aria-label="Rotate text"
                  title="Rotate text"
                  style={{
                    top: 0,
                    left: "50%",
                    transform: "translate(-50%, calc(-100% - 28px))",
                    cursor: "crosshair",
                  }}
                  onPointerDown={(e) => handleRotatePointerDown(e, overlay, rotation)}
                  onPointerMove={handleRotatePointerMove}
                  onPointerUp={handleRotatePointerUp}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-2.5 w-2.5 text-blue-700 drop-shadow-[0_0_1px_rgba(255,255,255,0.9)] pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 10a6 6 0 1 1-2.2-4.6" />
                    <path d="M16 4v4h-4" />
                  </svg>
                </div>
                {/* 8 resize handles */}
                {RESIZE_HANDLES.map((h) => (
                  <div
                    key={h.id}
                    className="absolute h-3 w-3 rounded-sm bg-blue-400 border-2 border-white shadow z-[90]"
                    style={{
                      ...h.style,
                      transform: `translate(${h.tx}, ${h.ty})`,
                      cursor: h.cursor,
                    }}
                    onPointerDown={(e) => handleResizePointerDown(e, overlay, scale)}
                    onPointerMove={handleResizePointerMove}
                    onPointerUp={handleResizePointerUp}
                  />
                ))}
              </>
            )}
          </div>
        );
      })}

      {/* FloatingTextToolbar renders with position:fixed so it floats above the canvas */}
      <FloatingTextToolbar />
    </div>
  );
}
