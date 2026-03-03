"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import { Play, Pause, Square, Plus, Type, Trash2, Copy, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/hooks/use-editor";
import { usePlayback } from "@/hooks/use-playback";
import { useOverlays } from "@/hooks/use-overlays";
import { useFrameThumbnails } from "@/hooks/use-frame-thumbnails";
import { cn } from "@/lib/utils";
import type { Overlay } from "@/core/domain/project";

// ─── Layout constants ───────────────────────────────────────────────────────

const LABEL_W = 148;
const RULER_H = 22;
const THUMB_ROW_H = 36;
const TRACK_H = 34;

// ─── Per-overlay colours ─────────────────────────────────────────────────────

const COLORS = [
  { bar: "bg-blue-500/75 border-blue-400/60", text: "text-white", dot: "bg-blue-400" },
  { bar: "bg-violet-500/75 border-violet-400/60", text: "text-white", dot: "bg-violet-400" },
  { bar: "bg-emerald-500/75 border-emerald-400/60", text: "text-white", dot: "bg-emerald-400" },
  { bar: "bg-orange-500/75 border-orange-400/60", text: "text-white", dot: "bg-orange-400" },
  { bar: "bg-rose-500/75 border-rose-400/60", text: "text-white", dot: "bg-rose-400" },
  { bar: "bg-cyan-500/75 border-cyan-400/60", text: "text-white", dot: "bg-cyan-400" },
];
const color = (i: number) => COLORS[i % COLORS.length];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function overlayRange(overlay: Overlay, frameCount: number) {
  if (!overlay.keyframes.length) return { start: 0, end: Math.max(0, frameCount - 1) };
  const indices = overlay.keyframes.map((k) => k.frameIndex);
  return { start: Math.min(...indices), end: Math.max(...indices) };
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

// ─── Playhead ────────────────────────────────────────────────────────────────

interface PlayheadProps {
  pct: number;
  totalRows: number; // ruler + n overlay rows
}
function Playhead({ pct, totalRows }: PlayheadProps) {
  const totalH = THUMB_ROW_H + RULER_H + totalRows * TRACK_H;
  return (
    <div
      className="absolute top-0 z-20 pointer-events-none"
      style={{ left: `${pct}%`, height: totalH }}
    >
      {/* triangle notch */}
      <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-red-500" />
      {/* vertical line */}
      <div className="absolute top-0 left-1/2 -translate-x-px w-px h-full bg-red-500/80" />
    </div>
  );
}

// ─── TimelinePanel ────────────────────────────────────────────────────────────

export function TimelinePanel() {
  const { state, dispatch } = useEditor();
  const { togglePlay, stop } = usePlayback();
  const { addOverlay, removeOverlay, duplicateOverlay } = useOverlays();

  const {
    frames,
    currentFrameIndex,
    overlays,
    isPlaying,
    selectedOverlayId,
    trimStart,
    trimEnd,
    playbackRate = 1,
  } = state;
  const frameCount = frames.length;
  const [timelineZoom, setTimelineZoom] = useState(1);
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

  // ── Track area ref (used for x → frame calculations) ─────────────────────
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

  // ── Overlay bar drag ──────────────────────────────────────────────────────
  const barDrag = useRef<{
    overlayId: string;
    startClientX: number;
    baseKeyframes: Overlay["keyframes"];
  } | null>(null);

  const handleBarDown = useCallback(
    (e: React.PointerEvent, overlay: Overlay) => {
      if (overlay.locked) return;
      e.stopPropagation();
      dispatch({ type: "SET_FRAME", payload: xToFrame(e.clientX) });
      dispatch({ type: "SELECT_OVERLAY", payload: overlay.id });
      barDrag.current = {
        overlayId: overlay.id,
        startClientX: e.clientX,
        baseKeyframes: overlay.keyframes.map((k) => ({ ...k })),
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [xToFrame, dispatch]
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

      const newKfs: Overlay["keyframes"] = drag.baseKeyframes.map((k) => ({
        ...k,
        frameIndex: Math.max(0, Math.min(frameCount - 1, k.frameIndex + frameDelta)),
      }));

      dispatch({
        type: "UPDATE_OVERLAY",
        payload: { id: overlay.id, updates: { keyframes: newKfs } },
      });
    },
    [frameCount, dispatch]
  );

  const handleBarUp = useCallback(() => {
    barDrag.current = null;
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

  // ── Playhead position as percent ──────────────────────────────────────────
  const playheadPct = frameCount > 1 ? (currentFrameIndex / (frameCount - 1)) * 100 : 0;
  const trimStartPct = frameCount > 1 ? (trimStartClamped / (frameCount - 1)) * 100 : 0;
  const trimEndPct = frameCount > 1 ? (trimEndClamped / (frameCount - 1)) * 100 : 100;

  // ─── Empty state ─────────────────────────────────────────────────────────
  if (frameCount === 0) {
    return (
      <div className="flex items-center px-4 h-full text-xs text-muted-foreground border-t border-border/50 bg-muted/10">
        Load a GIF to see the timeline
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-t border-border/50 bg-[var(--background)] select-none overflow-hidden">
      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-3 h-9 border-b border-border/40 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg"
          onClick={stop}
          aria-label="Stop"
        >
          <Square className="h-3 w-3" />
        </Button>

        <span className="text-xs tabular-nums text-muted-foreground ml-1">
          {formatTime(currentFrameIndex, avgDelay)}&nbsp;/&nbsp;
          {formatTime(frameCount - 1, avgDelay)}
        </span>
        <span className="text-xs text-muted-foreground/60">
          ({currentFrameIndex + 1} / {frameCount})
        </span>

        <span className="text-xs text-muted-foreground/80 ml-2">
          Speed {playbackRate}x
        </span>

        <div className="flex items-center gap-0.5">
          {([0.5, 1, 1.5, 2] as const).map((rate) => (
            <Button
              key={rate}
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 min-w-7 rounded text-xs tabular-nums",
                playbackRate === rate
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => dispatch({ type: "SET_PLAYBACK_RATE", payload: rate })}
              title={`Playback speed ${rate}×`}
            >
              {rate}×
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded"
            onClick={() => setTimelineZoom((z) => Math.max(1, Math.round((z - 0.25) * 4) / 4))}
            title="Zoom timeline out"
          >
            <span className="text-xs">-</span>
          </Button>
          <span className="text-[10px] w-10 text-center text-muted-foreground tabular-nums">
            {timelineZoom.toFixed(2)}x
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded"
            onClick={() => setTimelineZoom((z) => Math.min(3, Math.round((z + 0.25) * 4) / 4))}
            title="Zoom timeline in"
          >
            <span className="text-xs">+</span>
          </Button>
        </div>

        <div className="flex-1" />

        {selectedOverlay && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => duplicateOverlay(selectedOverlay.id)}
              title="Duplicate selected layer"
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg text-xs gap-1.5 text-destructive hover:text-destructive"
              onClick={() => removeOverlay(selectedOverlay.id)}
              disabled={selectedOverlay.locked}
              title="Remove selected layer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-7 rounded-lg text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={addOverlay}
          disabled={frameCount === 0}
          title="Add text layer"
        >
          <Plus className="h-3.5 w-3.5" />
          Add text
        </Button>
      </div>

      {/* ── Label + Track layout ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Label column */}
        <div
          className="flex flex-col shrink-0 border-r border-border/40"
          style={{ width: LABEL_W }}
        >
          {/* Thumbnail row label */}
          <div
            className="border-b border-border/30 bg-muted/30"
            style={{ height: THUMB_ROW_H }}
          />
          {/* Ruler label */}
          <div
            className="border-b border-border/30 bg-muted/30"
            style={{ height: RULER_H }}
          />
          {/* Per-overlay labels */}
          {overlays.map((overlay, i) => {
            const c = color(i);
            const isSelected = selectedOverlayId === overlay.id;
            const isHidden = overlay.visible === false;
            const isLocked = overlay.locked === true;
            return (
              <div
                key={overlay.id}
                className={cn(
                  "group flex items-center gap-2 px-2.5 cursor-pointer border-b border-border/25 transition-colors duration-100",
                  isSelected ? "bg-accent/40" : "hover:bg-muted/40",
                  isHidden && "opacity-55",
                  isLocked && "bg-amber-500/5"
                )}
                style={{ height: TRACK_H }}
                onClick={() => dispatch({ type: "SELECT_OVERLAY", payload: overlay.id })}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", c.dot)} />
                <Type className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="text-xs truncate text-foreground leading-none">
                  {overlay.content || "Text"}
                </span>
                {isLocked && <Lock className="h-3 w-3 shrink-0 text-amber-600" />}
                <button
                  type="button"
                  className={cn(
                    "ml-auto rounded p-1 transition-all",
                    isLocked
                      ? "cursor-not-allowed text-muted-foreground/40 opacity-100"
                      : "opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
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
            );
          })}
        </div>

        {/* Track area — ruler + tracks stacked, playhead absolute over both */}
        <div className="relative flex-1 min-w-0 overflow-auto">
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
            className="relative border-b border-border/40 bg-muted/20 flex overflow-hidden shrink-0"
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
                  "flex-shrink-0 border-r border-border/30 last:border-r-0 hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-ring",
                  currentFrameIndex === frameIndex && "ring-2 ring-primary ring-inset opacity-100"
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
                className="absolute top-0 bottom-0 w-1.5 z-20 cursor-ew-resize bg-primary border-x border-primary-foreground/30 hover:w-2 hover:bg-primary/90"
                style={{ left: `${trimStartPct}%`, transform: "translateX(-50%)" }}
                onPointerDown={(e) => handleTrimHandleDown(e, "start")}
                title="Trim start — drag to adjust"
              />
            )}
            {/* Draggable trim end handle */}
            {frameCount > 1 && (
              <div
                className="absolute top-0 bottom-0 w-1.5 z-20 cursor-ew-resize bg-primary border-x border-primary-foreground/30 hover:w-2 hover:bg-primary/90"
                style={{ left: `${trimEndPct}%`, transform: "translateX(-50%)" }}
                onPointerDown={(e) => handleTrimHandleDown(e, "end")}
                title="Trim end — drag to adjust"
              />
            )}
          </div>

          {/* Ruler */}
          <div
            className="relative border-b border-border/40 bg-muted/30 overflow-hidden"
            style={{ height: RULER_H }}
          >
            {rulerTicks.map((tick) => {
              const pct = (tick / Math.max(1, frameCount - 1)) * 100;
              return (
                <div
                  key={tick}
                  className="absolute top-0 flex flex-col items-center pointer-events-none"
                  style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                >
                  <span className="text-[9px] leading-none text-muted-foreground/70 mt-[3px]">
                    {tick}
                  </span>
                  <div className="w-px h-[6px] bg-border/60 mt-[3px]" />
                </div>
              );
            })}
          </div>

          {/* Overlay tracks */}
          {overlays.map((overlay, i) => {
            const c = color(i);
            const isSelected = selectedOverlayId === overlay.id;
            const isLocked = overlay.locked === true;
            const { start, end } = overlayRange(overlay, frameCount);
            const leftPct = (start / Math.max(1, frameCount - 1)) * 100;
            const widthPct = Math.max(
              ((end - start) / Math.max(1, frameCount - 1)) * 100,
              0.5
            );

            return (
              <div
                key={overlay.id}
                className={cn(
                  "relative border-b border-border/25 transition-colors duration-100",
                  isSelected ? "bg-accent/20" : "hover:bg-muted/20"
                )}
                style={{ height: TRACK_H }}
                onClick={() => dispatch({ type: "SELECT_OVERLAY", payload: overlay.id })}
              >
                {/* Overlay duration bar */}
                <div
                  className={cn(
                    "absolute top-[5px] bottom-[5px] rounded-md border flex items-center px-1.5 overflow-hidden cursor-grab active:cursor-grabbing",
                    isLocked && "cursor-not-allowed active:cursor-not-allowed",
                    c.bar
                  )}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  onPointerDown={(e) => handleBarDown(e, overlay)}
                  onPointerMove={(e) => handleBarMove(e, overlay)}
                  onPointerUp={handleBarUp}
                >
                  <span className={cn("text-[10px] font-medium truncate leading-none select-none pr-5", c.text)}>
                    {overlay.content || "Text"}
                  </span>
                  <button
                    type="button"
                    className={cn(
                      "absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors",
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

                  {/* Keyframe diamonds */}
                  {overlay.keyframes.map((kf) => {
                    const range = end - start;
                    const kfPct = range > 0 ? ((kf.frameIndex - start) / range) * 100 : 50;
                    return (
                      <div
                        key={kf.frameIndex}
                        title={`Frame ${kf.frameIndex}`}
                        className="absolute top-1/2 -translate-y-1/2 w-[7px] h-[7px] rotate-45 bg-white/90 border border-white/40 pointer-events-none"
                        style={{ left: `calc(${kfPct}% - 3.5px)` }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

            {/* Playhead */}
            <Playhead pct={playheadPct} totalRows={overlays.length} />
          </div>
        </div>
      </div>
    </div>
  );
}
