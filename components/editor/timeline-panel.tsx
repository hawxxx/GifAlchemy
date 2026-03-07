"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import {
  Play,
  Pause,
  Square,
  Plus,
  Minus,
  Type,
  Trash2,
  Copy,
  Lock,
  ClipboardPaste,
  Folder,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useEditor } from "@/hooks/use-editor";
import { usePlayback } from "@/hooks/use-playback";
import { useOverlays } from "@/hooks/use-overlays";
import { useFrameThumbnails } from "@/hooks/use-frame-thumbnails";
import { cn } from "@/lib/utils";
import {
  clampOverlayFrameRange,
  getOverlayFrameRange,
  shiftOverlayFrameRange,
  type Overlay,
} from "@/core/domain/project";
import { generateTweenedKeyframes, type TweenEasing } from "@/lib/tween-utils";

// ─── Layout constants ───────────────────────────────────────────────────────

const LABEL_W = 236;
const RULER_H = 22;
const THUMB_ROW_H = 36;
const TRACK_H = 34;

// ─── Per-overlay colours ─────────────────────────────────────────────────────

const COLORS = [
  { bar: "bg-gradient-to-r from-blue-500/40 to-blue-400/20 border-blue-400/30", text: "text-blue-50", dot: "bg-blue-400" },
  { bar: "bg-gradient-to-r from-violet-500/40 to-violet-400/20 border-violet-400/30", text: "text-violet-50", dot: "bg-violet-400" },
  { bar: "bg-gradient-to-r from-emerald-500/40 to-emerald-400/20 border-emerald-400/30", text: "text-emerald-50", dot: "bg-emerald-400" },
  { bar: "bg-gradient-to-r from-orange-500/40 to-orange-400/20 border-orange-400/30", text: "text-orange-50", dot: "bg-orange-400" },
  { bar: "bg-gradient-to-r from-rose-500/40 to-rose-400/20 border-rose-400/30", text: "text-rose-50", dot: "bg-rose-400" },
  { bar: "bg-gradient-to-r from-cyan-500/40 to-cyan-400/20 border-cyan-400/30", text: "text-cyan-50", dot: "bg-cyan-400" },
];
const color = (i: number) => COLORS[i % COLORS.length];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function overlayRange(overlay: Overlay, frameCount: number) {
  if (Number.isFinite(overlay.inFrame) || Number.isFinite(overlay.outFrame)) {
    return getOverlayFrameRange(overlay, frameCount);
  }
  if (overlay.keyframes.length > 0) {
    const indices = overlay.keyframes.map((k) => k.frameIndex);
    return clampOverlayFrameRange(Math.min(...indices), Math.max(...indices), frameCount);
  }
  return { inFrame: 0, outFrame: Math.max(0, frameCount - 1) };
}

function formatTime(frameIndex: number, avgDelayMs: number): string {
  const ms = Math.round(frameIndex * avgDelayMs);
  const s = Math.floor(ms / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${s}:${cs.toString().padStart(2, "0")}`;
}

function rulerTickInterval(frameCount: number) {
  if (frameCount <= 20) return 1;
  if (frameCount <= 60) return 5;
  if (frameCount <= 200) return 10;
  if (frameCount <= 600) return 25;
  return 50;
}

type SegmentEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out";
type KeyframeWithSegmentEasing = Overlay["keyframes"][number] & {
  easingToNext?: SegmentEasing;
};

const EASING_CYCLE: SegmentEasing[] = ["linear", "ease-in", "ease-out", "ease-in-out"];
const EASING_LABEL: Record<SegmentEasing, string> = {
  linear: "L",
  "ease-in": "In",
  "ease-out": "Out",
  "ease-in-out": "InOut",
};

const TWEEN_EASING_OPTIONS: { value: TweenEasing; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In-Out" },
];

// ─── Playhead ────────────────────────────────────────────────────────────────

interface PlayheadProps {
  pct: number;
  totalRows: number; // ruler + n overlay rows
}
function Playhead({ pct, totalRows }: PlayheadProps) {
  const totalH = THUMB_ROW_H + RULER_H + totalRows * TRACK_H;
  return (
    <div
      className="absolute top-0 z-20 pointer-events-none group transform-gpu transition-transform duration-75"
      style={{ left: `${pct}%`, height: totalH }}
    >
      {/* Scrubber cap / handle */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[14px] h-[18px] rounded-b-[7px] bg-primary shadow-[0_4px_16px_rgba(var(--primary-rgb),0.5),inset_0_1px_0_rgba(255,255,255,0.4)] flex items-end justify-center pb-[4px] border border-white/20 z-10 transition-transform group-hover:scale-y-110">
        {/* Inner grip dot */}
        <div className="w-[3px] h-[3px] rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
      </div>
      
      {/* Glowing core line */}
      <div className="absolute top-0 left-1/2 h-full w-[1px] -translate-x-[0.5px] bg-white/90 flex flex-col items-center">
         {/* Drop shadow / glow along the line */}
         <div className="absolute top-0 h-full w-[12px] bg-primary/25 blur-[5px] rounded-full" />
         <div className="absolute top-0 h-full w-[3px] bg-primary/40 blur-[1px] rounded-full" />
      </div>
    </div>
  );
}

// ─── TimelinePanel ────────────────────────────────────────────────────────────

export function TimelinePanel() {
  const { state, dispatch } = useEditor();
  const { togglePlay, stop } = usePlayback();
  const {
    addOverlay,
    removeOverlay,
    duplicateOverlay,
    reorderOverlays,
    updateOverlay,
    setSelectedOverlays,
    toggleOverlaySelection,
  } = useOverlays();

  const {
    frames,
    currentFrameIndex,
    overlays,
    isPlaying,
    selectedOverlayId,
    selectedOverlayIds,
    trimStart,
    trimEnd,
    playbackRate = 1,
  } = state;
  const frameCount = frames.length;
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [copiedKeyframe, setCopiedKeyframe] = useState<KeyframeWithSegmentEasing | null>(null);

  // ── Keyframe drag state ───────────────────────────────────────────────────
  const kfDragRef = useRef<{
    overlayId: string;
    originalFrame: number;
    currentTargetFrame: number;
  } | null>(null);
  const [kfDragIndicator, setKfDragIndicator] = useState<{
    overlayId: string;
    originalFrame: number;
    targetFrame: number;
  } | null>(null);

  // ── Tween popover state ───────────────────────────────────────────────────
  const [tweenPopover, setTweenPopover] = useState<{
    overlayId: string;
    easing: TweenEasing;
    rect: { top: number; left: number };
  } | null>(null);
  const lastFrame = Math.max(0, frameCount - 1);
  const trimEndClamped = Math.min(lastFrame, Math.max(trimStart, trimEnd));
  const trimStartClamped = Math.max(0, Math.min(trimEndClamped, trimStart));

  const avgDelay =
    frameCount > 0 ? frames.reduce((s, f) => s + f.delay, 0) / frameCount : 100;

  // ── Ruler ticks ──────────────────────────────────────────────────────────
  const interval = rulerTickInterval(frameCount);
  const rulerTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let i = 0; i < frameCount; i += interval) ticks.push(i);
    return ticks;
  }, [frameCount, interval]);

  const thumbnails = useFrameThumbnails(frames);
  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId) ?? null;
  const selectedSet = useMemo(() => new Set(selectedOverlayIds), [selectedOverlayIds]);

  const handleOverlaySelect = useCallback(
    (overlayId: string, multiSelect: boolean) => {
      if (!multiSelect) {
        dispatch({ type: "SELECT_OVERLAY", payload: overlayId });
        return;
      }
      toggleOverlaySelection(overlayId);
    },
    [dispatch, toggleOverlaySelection]
  );

  // ── Track area ref (used for x → frame calculations) ─────────────────────
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const xToFrame = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || frameCount <= 1) return 0;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(ratio * (frameCount - 1));
    },
    [frameCount]
  );

  // ── Playhead scrubbing ────────────────────────────────────────────────────
  const isScrubbing = useRef(false);

  const handleTrackDown = useCallback(
    (e: React.PointerEvent) => {
      if (frameCount === 0) return;
      isScrubbing.current = true;
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dispatch({ type: "SET_FRAME", payload: xToFrame(e.clientX) });
    },
    [xToFrame, frameCount, dispatch]
  );

  const handleTrackMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isScrubbing.current) return;
      dispatch({ type: "SET_FRAME", payload: xToFrame(e.clientX) });
    },
    [xToFrame, dispatch]
  );

  const handleTrackUp = useCallback(() => {
    isScrubbing.current = false;
  }, []);

  const applyTimelineZoom = useCallback(
    (nextZoom: number) => {
      const clamped = Math.max(1, Math.min(4, nextZoom));
      setTimelineZoom(clamped);
    },
    []
  );

  const fitTimelineZoom = useCallback(() => {
    const viewportW = scrollViewportRef.current?.clientWidth ?? 0;
    const spanFrames = Math.max(1, trimEndClamped - trimStartClamped + 1);
    if (viewportW <= 0 || frameCount <= 1) {
      applyTimelineZoom(1);
      return;
    }
    const targetPxPerFrame = 18;
    const zoomFromSpan = (spanFrames * targetPxPerFrame) / viewportW;
    const fitZoom = Math.max(1, Math.min(4, zoomFromSpan));
    applyTimelineZoom(fitZoom);
    requestAnimationFrame(() => {
      const viewport = scrollViewportRef.current;
      const track = trackRef.current;
      if (!viewport || !track) return;
      const trackW = track.getBoundingClientRect().width;
      const startX = (trimStartClamped / Math.max(1, frameCount - 1)) * trackW;
      viewport.scrollLeft = Math.max(0, startX - 16);
    });
  }, [applyTimelineZoom, trimStartClamped, trimEndClamped, frameCount]);

  // ── Overlay bar drag ──────────────────────────────────────────────────────
  const barDrag = useRef<{
    overlayId: string;
    movingOverlayIds: string[];
    startClientX: number;
    baseKeyframesById: Record<string, Overlay["keyframes"]>;
    baseRangeById: Record<string, { inFrame: number; outFrame: number }>;
  } | null>(null);

  const handleBarDown = useCallback(
    (e: React.PointerEvent, overlay: Overlay) => {
      if (overlay.locked) return;
      e.stopPropagation();
      dispatch({ type: "SET_FRAME", payload: xToFrame(e.clientX) });
      const inCurrentSelection = selectedSet.has(overlay.id);
      if (!inCurrentSelection) {
        setSelectedOverlays([overlay.id]);
      }
      const movingOverlays = overlay.groupId
        ? overlays.filter((o) => o.groupId === overlay.groupId && !o.locked)
        : overlays.filter((o) =>
            selectedSet.size > 1 && inCurrentSelection
              ? selectedSet.has(o.id) && !o.locked
              : o.id === overlay.id && !o.locked
          );
      barDrag.current = {
        overlayId: overlay.id,
        movingOverlayIds: movingOverlays.map((o) => o.id),
        startClientX: e.clientX,
        baseKeyframesById: Object.fromEntries(
          movingOverlays.map((o) => [o.id, o.keyframes.map((k) => ({ ...k }))])
        ),
        baseRangeById: Object.fromEntries(
          movingOverlays.map((o) => {
            const range = overlayRange(o, frameCount);
            return [o.id, { inFrame: range.inFrame, outFrame: range.outFrame }];
          })
        ),
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [xToFrame, dispatch, overlays, selectedSet, setSelectedOverlays, frameCount]
  );

  const handleBarMove = useCallback(
    (e: React.PointerEvent, overlay: Overlay) => {
      if (overlay.locked) return;
      const drag = barDrag.current;
      if (!drag || drag.overlayId !== overlay.id || frameCount <= 1) return;

      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dx = e.clientX - drag.startClientX;
      const frameDelta = Math.round((dx / rect.width) * (frameCount - 1));
      const movingSet = new Set(drag.movingOverlayIds);
      const next = overlays.map((current) => {
        if (!movingSet.has(current.id)) return current;
        const baseKfs = drag.baseKeyframesById[current.id];
        const baseRange = drag.baseRangeById[current.id];
        if (!baseKfs) return current;
        const shiftedRange = shiftOverlayFrameRange(
          baseRange ?? { inFrame: 0, outFrame: Math.max(0, frameCount - 1) },
          frameDelta,
          frameCount
        );
        return {
          ...current,
          keyframes: baseKfs.map((k) => ({
            ...k,
            frameIndex: Math.max(0, Math.min(frameCount - 1, k.frameIndex + frameDelta)),
          })),
          inFrame: shiftedRange.inFrame,
          outFrame: shiftedRange.outFrame,
        };
      });
      dispatch({ type: "SET_OVERLAYS", payload: next });
    },
    [frameCount, dispatch, overlays]
  );

  const updateOverlayFrameRange = useCallback(
    (overlay: Overlay, nextInFrame: number, nextOutFrame: number) => {
      if (overlay.locked) return;
      const range = clampOverlayFrameRange(nextInFrame, nextOutFrame, frameCount);
      updateOverlay(overlay.id, { inFrame: range.inFrame, outFrame: range.outFrame });
    },
    [frameCount, updateOverlay]
  );

  const moveOverlayByStep = useCallback(
    (overlay: Overlay, step: -1 | 1) => {
      if (overlay.locked) return;
      const index = overlays.findIndex((item) => item.id === overlay.id);
      if (index === -1) return;
      const targetIndex = index + step;
      if (targetIndex < 0 || targetIndex >= overlays.length) return;
      const target = overlays[targetIndex];
      if (!target) return;
      reorderOverlays(overlay.id, target.id);
    },
    [overlays, reorderOverlays]
  );

  const handleBarUp = useCallback(() => {
    barDrag.current = null;
  }, []);

  // ── Overlay bar trim handles ──────────────────────────────────────────────
  const barTrimDrag = useRef<{
    overlayId: string;
    side: "start" | "end";
    startClientX: number;
    baseRange: { inFrame: number; outFrame: number };
  } | null>(null);

  const handleBarTrimDown = useCallback(
    (e: React.PointerEvent, overlay: Overlay, side: "start" | "end") => {
      if (overlay.locked) return;
      e.stopPropagation();
      const range = overlayRange(overlay, frameCount);
      barTrimDrag.current = {
        overlayId: overlay.id,
        side,
        startClientX: e.clientX,
        baseRange: { inFrame: range.inFrame, outFrame: range.outFrame },
      };
      dispatch({ type: "SET_FRAME", payload: xToFrame(e.clientX) });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [dispatch, frameCount, xToFrame]
  );

  const handleBarTrimMove = useCallback(
    (e: React.PointerEvent, overlay: Overlay) => {
      if (overlay.locked) return;
      const drag = barTrimDrag.current;
      if (!drag || drag.overlayId !== overlay.id || frameCount <= 1) return;
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dx = e.clientX - drag.startClientX;
      const frameDelta = Math.round((dx / rect.width) * (frameCount - 1));

      if (drag.side === "start") {
        const nextStart = Math.min(drag.baseRange.outFrame, drag.baseRange.inFrame + frameDelta);
        updateOverlayFrameRange(overlay, nextStart, drag.baseRange.outFrame);
      } else {
        const nextEnd = Math.max(drag.baseRange.inFrame, drag.baseRange.outFrame + frameDelta);
        updateOverlayFrameRange(overlay, drag.baseRange.inFrame, nextEnd);
      }
    },
    [frameCount, updateOverlayFrameRange]
  );

  const handleBarTrimUp = useCallback(() => {
    barTrimDrag.current = null;
  }, []);

  // ── Trim handles (draggable on thumbnail row) ──────────────────────────────
  const trimHandleRef = useRef<"start" | "end" | null>(null);

  const handleTrimHandleDown = useCallback(
    (e: React.PointerEvent, which: "start" | "end") => {
      e.stopPropagation();
      trimHandleRef.current = which;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handleTrimMove = useCallback(
    (e: React.PointerEvent) => {
      const which = trimHandleRef.current;
      if (which === null || frameCount === 0) return;
      const frame = xToFrame(e.clientX);
      if (which === "start") {
        const newStart = Math.max(0, Math.min(frame, trimEndClamped));
        dispatch({ type: "SET_TRIM", payload: { trimStart: newStart, trimEnd: trimEndClamped } });
      } else {
        const newEnd = Math.max(trimStartClamped, Math.min(lastFrame, frame));
        dispatch({ type: "SET_TRIM", payload: { trimStart: trimStartClamped, trimEnd: newEnd } });
      }
    },
    [frameCount, xToFrame, trimStartClamped, trimEndClamped, lastFrame, dispatch]
  );

  const handleTrimUp = useCallback(() => {
    trimHandleRef.current = null;
  }, []);

  const selectedFrameKeyframe = useMemo(() => {
    if (!selectedOverlay) return null;
    return (
      selectedOverlay.keyframes.find((kf) => kf.frameIndex === currentFrameIndex) ?? null
    );
  }, [selectedOverlay, currentFrameIndex]);

  const copyKeyframeAtCurrentFrame = useCallback(() => {
    if (!selectedFrameKeyframe || !selectedOverlay || selectedOverlay.locked) return;
    setCopiedKeyframe({ ...(selectedFrameKeyframe as KeyframeWithSegmentEasing) });
  }, [selectedFrameKeyframe, selectedOverlay]);

  const pasteKeyframeAtCurrentFrame = useCallback(() => {
    if (!selectedOverlay || selectedOverlay.locked || !copiedKeyframe) return;
    const current = selectedOverlay.keyframes;
    const withPatched = current.some((kf) => kf.frameIndex === currentFrameIndex)
      ? current.map((kf) =>
          kf.frameIndex === currentFrameIndex
            ? { ...kf, ...copiedKeyframe, frameIndex: currentFrameIndex }
            : kf
        )
      : [...current, { ...copiedKeyframe, frameIndex: currentFrameIndex }];
    const sorted = [...withPatched].sort((a, b) => a.frameIndex - b.frameIndex);
    dispatch({
      type: "UPDATE_OVERLAY",
      payload: { id: selectedOverlay.id, updates: { keyframes: sorted } },
    });
  }, [selectedOverlay, copiedKeyframe, currentFrameIndex, dispatch]);

  const cycleSegmentEasing = useCallback(
    (overlay: Overlay, segmentStartFrame: number) => {
      if (overlay.locked) return;
      const sorted = [...overlay.keyframes].sort((a, b) => a.frameIndex - b.frameIndex);
      const nextKfs = sorted.map((kf) => {
        if (kf.frameIndex !== segmentStartFrame) return kf;
        const start = kf as KeyframeWithSegmentEasing;
        const currentEasing = start.easingToNext ?? "linear";
        const idx = EASING_CYCLE.indexOf(currentEasing);
        const nextEasing = EASING_CYCLE[(idx + 1) % EASING_CYCLE.length];
        return { ...start, easingToNext: nextEasing };
      });
      dispatch({
        type: "UPDATE_OVERLAY",
        payload: { id: overlay.id, updates: { keyframes: nextKfs } },
      });
    },
    [dispatch]
  );

  // ── Keyframe drag handlers ────────────────────────────────────────────────
  const handleKfPointerDown = useCallback(
    (e: React.PointerEvent, overlay: Overlay, kfFrame: number) => {
      if (overlay.locked) return;
      e.stopPropagation();
      kfDragRef.current = { overlayId: overlay.id, originalFrame: kfFrame, currentTargetFrame: kfFrame };
      setKfDragIndicator({ overlayId: overlay.id, originalFrame: kfFrame, targetFrame: kfFrame });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handleKfPointerMove = useCallback(
    (e: React.PointerEvent, overlay: Overlay) => {
      e.stopPropagation();
      const drag = kfDragRef.current;
      if (!drag || drag.overlayId !== overlay.id) return;
      const frame = xToFrame(e.clientX);
      const taken = overlay.keyframes.some(
        (kf) => kf.frameIndex === frame && kf.frameIndex !== drag.originalFrame
      );
      if (!taken) {
        drag.currentTargetFrame = frame;
        setKfDragIndicator({ overlayId: overlay.id, originalFrame: drag.originalFrame, targetFrame: frame });
      }
    },
    [xToFrame]
  );

  const handleKfPointerUp = useCallback(
    (overlay: Overlay) => {
      const drag = kfDragRef.current;
      if (!drag || drag.overlayId !== overlay.id) {
        kfDragRef.current = null;
        setKfDragIndicator(null);
        return;
      }
      const targetFrame = drag.currentTargetFrame;
      if (targetFrame !== drag.originalFrame) {
        const newKeyframes = overlay.keyframes
          .map((kf) =>
            kf.frameIndex === drag.originalFrame ? { ...kf, frameIndex: targetFrame } : kf
          )
          .sort((a, b) => a.frameIndex - b.frameIndex);
        dispatch({
          type: "UPDATE_OVERLAY",
          payload: { id: overlay.id, updates: { keyframes: newKeyframes } },
        });
      }
      kfDragRef.current = null;
      setKfDragIndicator(null);
    },
    [dispatch]
  );

  // ── Tween handlers ────────────────────────────────────────────────────────
  const handleApplyTween = useCallback(
    (overlay: Overlay, easing: TweenEasing) => {
      if (overlay.locked) return;
      const newKeyframes = generateTweenedKeyframes(overlay, easing);
      dispatch({
        type: "UPDATE_OVERLAY",
        payload: { id: overlay.id, updates: { keyframes: newKeyframes } },
      });
      setTweenPopover(null);
    },
    [dispatch]
  );

  const handleClearTweens = useCallback(
    (overlay: Overlay) => {
      if (overlay.locked) return;
      const anchors = overlay.keyframes.filter((kf) => !kf.tweened);
      dispatch({
        type: "UPDATE_OVERLAY",
        payload: { id: overlay.id, updates: { keyframes: anchors } },
      });
      setTweenPopover(null);
    },
    [dispatch]
  );

  // ── Playhead position as percent ──────────────────────────────────────────
  const playheadPct = frameCount > 1 ? (currentFrameIndex / (frameCount - 1)) * 100 : 0;
  const trimStartPct = frameCount > 1 ? (trimStartClamped / (frameCount - 1)) * 100 : 0;
  const trimEndPct = frameCount > 1 ? (trimEndClamped / (frameCount - 1)) * 100 : 100;

  // ─── Empty state ─────────────────────────────────────────────────────────
  if (frameCount === 0) {
    return (
      <div className="flex h-full items-center border-t border-white/10 bg-white/[0.04] px-4 text-xs text-muted-foreground">
        Load a GIF to see the timeline
      </div>
    );
  }

  return (
    <div className="flex h-full select-none flex-col overflow-hidden relative">
      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className="relative flex h-12 shrink-0 items-center justify-between border-b border-white/8 bg-[#0a0a0a]/90 px-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        {/* Left section: Time & Frame Info */}
        <div className="flex flex-1 items-center gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-medium tabular-nums tracking-wide text-white/90">
              {formatTime(currentFrameIndex, avgDelay)}
            </span>
            <span className="text-[11px] font-medium tabular-nums text-white/40">
              / {formatTime(frameCount - 1, avgDelay)}
            </span>
          </div>
          <div className="h-3.5 w-px bg-white/10" />
          <div className="flex items-center gap-1 rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[10px] tabular-nums tracking-[0.05em] text-white/50">
            <span className="text-white/80">{currentFrameIndex + 1}</span>
            <span className="text-white/30">/</span>
            <span>{frameCount}</span>
            <span className="ml-1 uppercase tracking-widest text-white/30">frames</span>
          </div>
          <span
            className="hidden sm:inline text-[10px] text-muted-foreground/40 ml-1 font-medium tracking-wide"
            title="Press A/D to step through frames (when not editing text)"
          >
            A/D: Step
          </span>
        </div>

        {/* Center section: The Premium Control Island */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(24,28,36,0.8),rgba(14,16,21,0.9))] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl">
          {/* Play/Stop */}
          <div className="flex items-center gap-0.5 pl-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 rounded-full transition-all duration-200",
                isPlaying
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(var(--primary),0.5)]"
                  : "text-white/85 hover:bg-white/10 hover:text-white"
              )}
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-white/60 transition-colors duration-150 hover:bg-white/10 hover:text-white"
              onClick={stop}
              aria-label="Stop"
            >
              <Square className="h-3 w-3" />
            </Button>
          </div>

          <div className="mx-1 h-4 w-[1px] bg-white/10" />

          {/* Speed Control */}
          <div className="flex items-center gap-1 px-1">
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-full text-white/50 transition-colors duration-200 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => dispatch({ type: "SET_PLAYBACK_RATE", payload: Math.max(0.25, playbackRate - 0.25) })}
              disabled={playbackRate <= 0.25}
              title="Decrease speed"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-9 text-center text-[11px] font-semibold tabular-nums text-white/90">
              {playbackRate.toFixed(2).replace(/\.?0+$/, '')}x
            </span>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-full text-white/50 transition-colors duration-200 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => dispatch({ type: "SET_PLAYBACK_RATE", payload: Math.min(3, playbackRate + 0.25) })}
              disabled={playbackRate >= 3}
              title="Increase speed"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="mx-1 h-4 w-[1px] bg-white/10" />

          {/* Zoom Control */}
          <div className="flex items-center gap-1.5 pr-2">
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-full text-white/50 transition-colors duration-200 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => applyTimelineZoom(Math.round((timelineZoom - 0.25) * 20) / 20)}
              disabled={timelineZoom <= 1}
              title="Zoom out"
            >
              <Minus className="h-3 w-3" />
            </button>
            <Slider
              min={1}
              max={4}
              step={0.05}
              value={[timelineZoom]}
              onValueChange={([v]) => {
                if (v !== undefined && Number.isFinite(v)) applyTimelineZoom(v);
              }}
              className="w-20 [&_[data-slot=range]]:bg-primary [&_[data-slot=thumb]]:h-3.5 [&_[data-slot=thumb]]:w-3.5 [&_[data-slot=thumb]]:border-none [&_[data-slot=thumb]]:bg-white [&_[data-slot=thumb]]:shadow-[0_2px_8px_rgba(0,0,0,0.4)] [&_[data-slot=track]]:h-1.5 [&_[data-slot=track]]:rounded-full [&_[data-slot=track]]:bg-black/60 [&_[data-slot=track]]:shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] cursor-ew-resize"
              aria-label="Zoom slider"
            />
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-full text-white/50 transition-colors duration-200 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => applyTimelineZoom(Math.round((timelineZoom + 0.25) * 20) / 20)}
              disabled={timelineZoom >= 4}
              title="Zoom in"
            >
              <Plus className="h-3 w-3" />
            </button>
            <div className="ml-0.5 flex items-center h-full">
               <span className="w-7 text-center text-[10px] font-bold tabular-nums text-white/60">
                 {timelineZoom === 1 ? "1×" : `${parseFloat(timelineZoom.toFixed(1))}×`}
               </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-6 px-2 rounded-full bg-white/[0.08] text-[9px] font-bold uppercase tracking-widest text-white/70 transition-all duration-200 hover:bg-white/20 hover:text-white border border-white/5 active:scale-95"
                  onClick={fitTimelineZoom}
                  title="Fit timeline to view"
                >
                  Fit
                </Button>
            </div>
          </div>
        </div>

        {/* Right section: Action Buttons */}
        <div className="flex flex-1 items-center justify-end gap-1.5">
          {selectedOverlay && (
            <div className="flex items-center gap-1.5 mr-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 rounded-lg bg-white/[0.03] px-3 text-[11px] font-medium text-white/70 border border-white/5 transition-all duration-200 hover:bg-white/[0.08] hover:text-white active:scale-95"
                onClick={copyKeyframeAtCurrentFrame}
                disabled={!selectedFrameKeyframe || selectedOverlay.locked}
                title="Copy Keyframe"
              >
                <div className="flex h-4 w-4 items-center justify-center rounded-sm bg-black/40">
                  <Copy className="h-2.5 w-2.5" />
                </div>
                Copy KF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 rounded-lg bg-white/[0.03] px-3 text-[11px] font-medium text-white/70 border border-white/5 transition-all duration-200 hover:bg-white/[0.08] hover:text-white active:scale-95"
                onClick={pasteKeyframeAtCurrentFrame}
                disabled={!copiedKeyframe || selectedOverlay.locked}
                title="Paste Keyframe"
              >
                <div className="flex h-4 w-4 items-center justify-center rounded-sm bg-black/40">
                  <ClipboardPaste className="h-2.5 w-2.5" />
                </div>
                Paste KF
              </Button>
              <div className="h-4 w-px bg-white/10 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-lg bg-white/[0.03] p-0 text-white/70 border border-white/5 transition-all duration-200 hover:bg-white/[0.08] hover:text-white active:scale-95"
                onClick={() => duplicateOverlay(selectedOverlay.id)}
                title="Duplicate layer"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-lg bg-red-500/10 p-0 text-red-400 border border-red-500/10 transition-all duration-200 hover:bg-red-500/20 hover:text-red-300 active:scale-95"
                onClick={() => removeOverlay(selectedOverlay.id)}
                disabled={selectedOverlay.locked}
                title="Remove layer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-lg bg-primary/10 px-3 text-[11px] font-semibold tracking-wide text-primary border border-primary/20 transition-all duration-200 hover:bg-primary/20 hover:text-primary-foreground active:scale-95 shadow-[0_4px_12px_rgba(var(--primary),0.1)]"
            onClick={() => addOverlay()}
            disabled={frameCount === 0}
            title="Add new text layer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Layer
          </Button>
        </div>
      </div>

      {/* ── Label + Track layout ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Label column */}
        <div
          className="flex flex-col shrink-0 border-r border-white/10 bg-black/15"
          style={{ width: LABEL_W }}
        >
          {/* Thumbnail row label */}
          <div
            className="border-b border-white/10 bg-white/[0.04]"
            style={{ height: THUMB_ROW_H }}
          />
          {/* Ruler label */}
          <div
            className="border-b border-white/10 bg-white/[0.05]"
            style={{ height: RULER_H }}
          />
          {/* Per-overlay labels */}
          {overlays.map((overlay, i) => {
            const c = color(i);
            const isSelected = selectedSet.has(overlay.id);
            const isHidden = overlay.visible === false;
            const isLocked = overlay.locked === true;
            return (
              <div
                key={overlay.id}
                className={cn(
                  "group flex cursor-pointer items-center gap-2 border-b border-white/[0.08] px-2.5 transition-colors duration-150",
                  isSelected
                    ? "bg-primary/[0.14] shadow-[inset_2px_0_0_rgba(255,255,255,0.35)]"
                    : "hover:bg-white/[0.05]",
                  isHidden && "opacity-55",
                  isLocked && "bg-amber-500/5"
                )}
                style={{ height: TRACK_H }}
                onClick={(e) => handleOverlaySelect(overlay.id, e.metaKey || e.ctrlKey)}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", c.dot)} />
                <Type className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="text-xs truncate text-foreground leading-none">
                  {overlay.content || "Text"}
                </span>
                <div className="flex items-center gap-0.5 rounded-full border border-white/12 bg-black/35 p-0.5 opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    className={cn(
                      "rounded p-1 transition-colors duration-150",
                      isLocked ? "cursor-not-allowed text-muted-foreground/40" : "hover:bg-white/15"
                    )}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOverlay(overlay.id, { visible: overlay.visible === false });
                    }}
                    disabled={isLocked}
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
                    type="button"
                    className={cn(
                      "rounded p-1 transition-colors duration-150",
                      isLocked ? "cursor-not-allowed text-muted-foreground/40" : "hover:bg-white/15"
                    )}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateOverlay(overlay.id);
                    }}
                    disabled={isLocked}
                    aria-label="Duplicate layer"
                    title="Duplicate layer"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded p-1 transition-colors duration-150",
                      isLocked ? "cursor-not-allowed text-muted-foreground/40" : "hover:bg-white/15"
                    )}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveOverlayByStep(overlay, -1);
                    }}
                    disabled={isLocked || i === 0}
                    aria-label="Move layer up"
                    title="Move layer up"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded p-1 transition-colors duration-150",
                      isLocked ? "cursor-not-allowed text-muted-foreground/40" : "hover:bg-white/15"
                    )}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveOverlayByStep(overlay, 1);
                    }}
                    disabled={isLocked || i === overlays.length - 1}
                    aria-label="Move layer down"
                    title="Move layer down"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                  {overlay.keyframes.filter((kf) => !kf.tweened).length >= 2 && (
                    <button
                      type="button"
                      className={cn(
                        "rounded p-1 transition-colors duration-150",
                        isLocked
                          ? "cursor-not-allowed text-muted-foreground/40"
                          : tweenPopover?.overlayId === overlay.id
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground hover:bg-white/15 hover:text-foreground"
                      )}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (tweenPopover?.overlayId === overlay.id) {
                          setTweenPopover(null);
                          return;
                        }
                        const btn = e.currentTarget as HTMLButtonElement;
                        const r = btn.getBoundingClientRect();
                        setTweenPopover({
                          overlayId: overlay.id,
                          easing: "linear",
                          rect: { top: r.bottom + 4, left: r.left },
                        });
                      }}
                      disabled={isLocked}
                      aria-label="Tween keyframes"
                      title="Auto-generate intermediate keyframes (tweening)"
                    >
                      <Wand2 className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    className={cn(
                      "rounded p-1 transition-colors duration-150",
                      isLocked
                        ? "cursor-not-allowed text-muted-foreground/40"
                        : "hover:bg-destructive/10 hover:text-destructive"
                    )}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOverlay(overlay.id);
                    }}
                    disabled={isLocked}
                    aria-label="Remove layer"
                    title={isLocked ? "Unlock layer to remove" : "Remove layer from timeline"}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {overlay.groupId && (
                  <span
                    className="inline-flex items-center rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground"
                    title={`Grouped layer (${overlay.groupId})`}
                  >
                    <Folder className="h-2.5 w-2.5" />
                  </span>
                )}
                {isLocked && <Lock className="h-3 w-3 shrink-0 text-amber-600" />}
              </div>
            );
          })}
        </div>

        {/* Track area — ruler + tracks stacked, playhead absolute over both */}
        <div
          ref={scrollViewportRef}
          className="relative flex-1 min-w-0 overflow-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.025)_0%,rgba(255,255,255,0.012)_100%)]"
        >
          <div
            ref={trackRef}
            className="relative min-h-full cursor-crosshair"
            style={{ width: `${timelineZoom * 100}%`, minWidth: "100%" }}
            onPointerDown={handleTrackDown}
            onPointerMove={handleTrackMove}
            onPointerUp={handleTrackUp}
          >
          {/* Frame thumbnails — click to seek; trim range dimmed, draggable handles */}
          <div
            className="relative flex shrink-0 overflow-hidden border-b border-white/10 bg-white/[0.05]"
            style={{ height: THUMB_ROW_H }}
            onPointerMove={handleTrimMove}
            onPointerUp={handleTrimUp}
            onPointerLeave={handleTrimUp}
          >
            {thumbnails.map(({ frameIndex, dataUrl }) => (
              <button
                key={frameIndex}
                type="button"
                onClick={() => dispatch({ type: "SET_FRAME", payload: frameIndex })}
                className={cn(
                  "flex-shrink-0 border-r border-white/15 last:border-r-0 transition-[filter,box-shadow,opacity] duration-150 hover:brightness-105 focus:outline-none focus:ring-1 focus:ring-primary/70",
                  currentFrameIndex === frameIndex &&
                    "opacity-100 ring-2 ring-primary/85 ring-inset shadow-[inset_0_0_0_1px_rgba(255,255,255,0.38)]"
                )}
                style={{
                  width: thumbnails.length > 0 ? `${100 / thumbnails.length}%` : undefined,
                  minWidth: 24,
                  backgroundImage: `url(${dataUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                title={`Frame ${frameIndex + 1}`}
              />
            ))}
            {/* Dimmed overlay for frames outside trim range */}
            {frameCount > 1 && (trimStartClamped > 0 || trimEndClamped < lastFrame) && (
              <>
                <div
                  className="absolute inset-y-0 left-0 bg-black/50 pointer-events-none z-10"
                  style={{ width: `${trimStartPct}%` }}
                />
                <div
                  className="absolute inset-y-0 right-0 bg-black/50 pointer-events-none z-10"
                  style={{ width: `${100 - trimEndPct}%` }}
                />
              </>
            )}
            {/* Draggable trim start handle */}
            {frameCount > 1 && (
              <div
                className="absolute top-0 bottom-0 z-20 w-1.5 cursor-ew-resize border-x border-primary-foreground/30 bg-primary/95 hover:w-2 hover:bg-primary/85"
                style={{ left: `${trimStartPct}%`, transform: "translateX(-50%)" }}
                onPointerDown={(e) => handleTrimHandleDown(e, "start")}
                title="Trim start — drag to adjust"
              />
            )}
            {/* Draggable trim end handle */}
            {frameCount > 1 && (
              <div
                className="absolute top-0 bottom-0 z-20 w-1.5 cursor-ew-resize border-x border-primary-foreground/30 bg-primary/95 hover:w-2 hover:bg-primary/85"
                style={{ left: `${trimEndPct}%`, transform: "translateX(-50%)" }}
                onPointerDown={(e) => handleTrimHandleDown(e, "end")}
                title="Trim end — drag to adjust"
              />
            )}
          </div>

          {/* Ruler */}
          <div
            className="relative overflow-hidden border-b border-white/10 bg-black/20"
            style={{ height: RULER_H }}
          >
            {rulerTicks.map((tick) => {
              const pct = (tick / Math.max(1, frameCount - 1)) * 100;
              const isMajor = tick === 0 || tick % Math.max(interval * 2, 10) === 0;
              return (
                <div
                  key={tick}
                  className="absolute top-0 flex flex-col items-center pointer-events-none"
                  style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                >
                  <span
                    className={cn(
                      "mt-[2px] text-[8px] font-bold tracking-tighter tabular-nums",
                      isMajor ? "text-white/60" : "text-white/25"
                    )}
                  >
                    {tick}
                  </span>
                  <div className={cn("mt-[2px] w-[1px]", isMajor ? "h-[10px] bg-white/40" : "h-[6px] bg-white/15")} />
                </div>
              );
            })}
          </div>

          {/* Overlay tracks */}
          {overlays.map((overlay, i) => {
            const c = color(i);
            const isSelected = selectedSet.has(overlay.id);
            const isLocked = overlay.locked === true;
            const { inFrame: start, outFrame: end } = overlayRange(overlay, frameCount);
            const leftPct = (start / Math.max(1, frameCount - 1)) * 100;
            const widthPct = Math.max(
              ((end - start) / Math.max(1, frameCount - 1)) * 100,
              0.5
            );

            return (
              <div
                key={overlay.id}
                className={cn(
                  "relative border-b border-white/[0.06] transition-colors duration-200",
                  isSelected ? "bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]" : "hover:bg-white/[0.02]"
                )}
                style={{ height: TRACK_H }}
                onClick={(e) => handleOverlaySelect(overlay.id, e.metaKey || e.ctrlKey)}
              >
                {/* Overlay duration bar */}
                <div
                  className={cn(
                    "absolute bottom-[5px] top-[5px] flex cursor-grab items-center overflow-hidden rounded-[8px] border px-2 shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-150 active:cursor-grabbing hover:brightness-110 active:scale-[0.99]",
                    isLocked && "cursor-not-allowed active:cursor-not-allowed filter grayscale opacity-60",
                    isSelected && "ring-[1.5px] ring-white/60 ring-offset-1 ring-offset-black/50 shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]",
                    c.bar
                  )}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  onPointerDown={(e) => handleBarDown(e, overlay)}
                  onPointerMove={(e) => handleBarMove(e, overlay)}
                  onPointerUp={handleBarUp}
                >
                  {!isLocked && (
                    <>
                      <div
                        className="absolute bottom-0 left-0 top-0 z-10 w-2.5 cursor-ew-resize border-r border-white/20 bg-black/20 transition-all duration-150 hover:bg-black/40 hover:w-3 flex items-center justify-center group"
                        onPointerDown={(e) => handleBarTrimDown(e, overlay, "start")}
                        onPointerMove={(e) => handleBarTrimMove(e, overlay)}
                        onPointerUp={handleBarTrimUp}
                        title="Trim layer start"
                      >
                        <div className="w-[1.5px] h-3 bg-white/40 rounded-full group-hover:bg-white/70" />
                      </div>
                      <div
                        className="absolute bottom-0 right-0 top-0 z-10 w-2.5 cursor-ew-resize border-l border-white/20 bg-black/20 transition-all duration-150 hover:bg-black/40 hover:w-3 flex items-center justify-center group"
                        onPointerDown={(e) => handleBarTrimDown(e, overlay, "end")}
                        onPointerMove={(e) => handleBarTrimMove(e, overlay)}
                        onPointerUp={handleBarTrimUp}
                        title="Trim layer end"
                      >
                        <div className="w-[1.5px] h-3 bg-white/40 rounded-full group-hover:bg-white/70" />
                      </div>
                    </>
                  )}
                  <span className={cn("text-[10px] font-medium truncate leading-none select-none pr-5", c.text)}>
                    {overlay.content || "Text"}
                  </span>
                  <button
                    type="button"
                    className={cn(
                      "absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors duration-150",
                      isLocked
                        ? "cursor-not-allowed text-white/40"
                        : "text-white/85 hover:text-white hover:bg-black/25"
                    )}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOverlay(overlay.id);
                    }}
                    disabled={isLocked}
                    aria-label="Remove layer"
                    title={isLocked ? "Unlock layer to remove" : "Remove layer"}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>

                  {/* Keyframe connection line */}
                  {(() => {
                    const kfs = (Array.isArray(overlay.keyframes) ? overlay.keyframes : [])
                      .filter(kf => Boolean(kf) && Number.isFinite(kf.frameIndex))
                      .sort((a, b) => a.frameIndex - b.frameIndex);
                    if (kfs.length < 2) return null;
                    const range = end - start;
                    if (range <= 0) return null;
                    const firstKf = kfs[0];
                    const lastKf = kfs[kfs.length - 1];
                    const startPct = ((firstKf.frameIndex - start) / range) * 100;
                    const endPct = ((lastKf.frameIndex - start) / range) * 100;
                    return (
                      <div 
                        className="absolute top-1/2 -translate-y-[0.5px] h-[1px] bg-white/15 pointer-events-none"
                        style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
                      />
                    );
                  })()}

                  {/* Keyframe diamonds — draggable */}
                  {(() => {
                    const validSortedKeyframes = (Array.isArray(overlay.keyframes) ? overlay.keyframes : [])
                      .filter(
                        (kf): kf is Overlay["keyframes"][number] =>
                          Boolean(kf) && Number.isFinite(kf.frameIndex)
                      )
                      .sort((a, b) => a.frameIndex - b.frameIndex);

                    return validSortedKeyframes.map((kf, idx) => {
                      const range = end - start;
                      const isDragging =
                        kfDragIndicator?.overlayId === overlay.id &&
                        kfDragIndicator.originalFrame === kf.frameIndex;
                      const visualFrame = isDragging ? kfDragIndicator.targetFrame : kf.frameIndex;
                      const visualPct = range > 0 ? ((visualFrame - start) / range) * 100 : 50;
                      const isTweened = kf.tweened === true;
                      return (
                        <div
                          key={`${overlay.id}-kf-${kf.frameIndex}-${idx}-${isTweened ? "t" : "m"}`}
                          title={
                            isLocked
                              ? `Frame ${kf.frameIndex}${isTweened ? " (tweened)" : ""}`
                              : `Frame ${kf.frameIndex}${isTweened ? " (tweened)" : ""} — drag to move`
                          }
                          className={cn(
                            "absolute top-1/2 z-10 -translate-y-1/2 rotate-45 border transition-[transform,background-color,border-color] duration-150",
                            isTweened
                              ? "h-[5px] w-[5px] border-white/28 bg-white/42"
                              : "h-[9px] w-[9px] border-white/45 bg-white/85 shadow-[0_0_0_1px_rgba(0,0,0,0.22)]",
                            isLocked
                              ? "cursor-not-allowed"
                              : "cursor-ew-resize hover:border-yellow-400 hover:bg-yellow-200",
                            isDragging && "bg-yellow-300 border-yellow-500 scale-125"
                          )}
                          style={{ left: `calc(${visualPct}% - ${isTweened ? 2.5 : 4.5}px)` }}
                          onPointerDown={(e) => {
                            if (isTweened) return;
                            handleKfPointerDown(e, overlay, kf.frameIndex);
                          }}
                          onPointerMove={(e) => handleKfPointerMove(e, overlay)}
                          onPointerUp={() => handleKfPointerUp(overlay)}
                        >
                          {isDragging && (
                            <span
                              className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] bg-black/80 text-white px-1 rounded whitespace-nowrap rotate-[-45deg]"
                              style={{ pointerEvents: "none" }}
                            >
                              {visualFrame}
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                  {/* Segment easing toggles (start keyframe controls its segment to next keyframe) */}
                  {(() => {
                    const validSortedKeyframes = (Array.isArray(overlay.keyframes) ? overlay.keyframes : [])
                      .filter(
                        (kf): kf is Overlay["keyframes"][number] =>
                          Boolean(kf) && Number.isFinite(kf.frameIndex)
                      )
                      .sort((a, b) => a.frameIndex - b.frameIndex);

                    return validSortedKeyframes.slice(0, -1).map((startKf, idx) => {
                      const endKf = validSortedKeyframes[idx + 1];
                      if (!endKf) return null;

                      const range = end - start;
                      const midFrame = (startKf.frameIndex + endKf.frameIndex) / 2;
                      const midPct = range > 0 ? ((midFrame - start) / range) * 100 : 50;
                      const easingValue = (startKf as KeyframeWithSegmentEasing).easingToNext;
                      const easing =
                        easingValue && easingValue in EASING_LABEL ? easingValue : "linear";
                      return (
                        <button
                          key={`${overlay.id}-seg-${startKf.frameIndex}-${endKf.frameIndex}-${idx}`}
                          type="button"
                          className={cn(
                            "absolute top-[3px] -translate-x-1/2 rounded-sm border px-1 py-px text-[8px] leading-none transition-colors duration-150",
                            "border-white/24 bg-black/40 text-white/90 hover:bg-black/56",
                            overlay.locked && "cursor-not-allowed opacity-60"
                          )}
                          style={{ left: `${midPct}%` }}
                          title={`Segment ${startKf.frameIndex}→${endKf.frameIndex}: ${easing}. Click to cycle.`}
                          disabled={overlay.locked}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            cycleSegmentEasing(overlay, startKf.frameIndex);
                          }}
                        >
                          {EASING_LABEL[easing]}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          })}

            {/* Playhead */}
            <Playhead pct={playheadPct} totalRows={overlays.length} />
          </div>
        </div>
      </div>

      {/* ── Tween popover (fixed-positioned to escape overflow) ─────────────── */}
      {tweenPopover && (() => {
        const popoverOverlay = overlays.find((o) => o.id === tweenPopover.overlayId);
        const hasTweens = popoverOverlay?.keyframes.some((kf) => kf.tweened) ?? false;
        return (
          <>
            <div
              className="fixed inset-0 z-[199]"
              onClick={() => setTweenPopover(null)}
            />
            <div
              className="fixed z-[200] flex min-w-[160px] flex-col gap-2 rounded-lg border border-border bg-popover p-3 shadow-lg"
              style={{ top: tweenPopover.rect.top, left: tweenPopover.rect.left }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Tween easing
              </p>
              <div className="flex flex-col gap-1">
                {TWEEN_EASING_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "rounded px-2 py-1 text-left text-xs transition-colors",
                      tweenPopover.easing === value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    )}
                    onClick={() => setTweenPopover((p) => p ? { ...p, easing: value } : null)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1 border-t border-border/40 pt-1">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded bg-primary px-2 py-1 text-xs text-primary-foreground transition-colors hover:bg-primary/90"
                  onClick={() => {
                    if (!popoverOverlay) return;
                    handleApplyTween(popoverOverlay, tweenPopover.easing);
                  }}
                >
                  <Wand2 className="h-3 w-3" />
                  Apply tween
                </button>
                {hasTweens && (
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10"
                    onClick={() => {
                      if (!popoverOverlay) return;
                      handleClearTweens(popoverOverlay);
                    }}
                  >
                    Clear tweens
                  </button>
                )}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
