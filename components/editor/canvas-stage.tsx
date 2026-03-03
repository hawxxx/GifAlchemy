"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { UploadZone } from "./upload-zone";
import { SkeletonLoader } from "./skeleton-loader";
import { OverlayRenderer } from "./overlay-renderer";
import { useEditor } from "@/hooks/use-editor";
import { useProcessor } from "@/hooks/use-processor";
import { ERROR_MESSAGES } from "@/lib/constants";
import type { ProcessingProgress } from "@/core/domain/gif-types";

function ExportProgressOverlay({
  progress,
  onCancel,
}: {
  progress: ProcessingProgress | null;
  onCancel: () => void;
}) {
  const startRef = useRef<number | null>(null);
  const [, setTick] = useState(0);

  if (progress && startRef.current === null) startRef.current = Date.now();

  useEffect(() => {
    if (!progress || progress.percent >= 100) return;
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [progress?.percent]);

  const percent = progress?.percent ?? 0;
  const phase = progress?.phase || "Processing...";
  const start = startRef.current ?? Date.now();
  const elapsedMs = Date.now() - start;
  const estimatedRemainingSec =
    percent > 0 && percent < 100
      ? Math.max(0, Math.round((elapsedMs / percent) * (100 - percent) / 1000))
      : null;

  return (
    <div className="relative flex items-center justify-center h-full">
      <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-xl backdrop-blur-sm">
        <div className="rounded-xl border border-border bg-card px-6 py-5 shadow-lg min-w-[280px] max-w-[90vw]">
          <p className="text-sm font-semibold text-foreground mb-2">{phase}</p>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-3">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground tabular-nums">
              <span className="font-medium text-foreground">{percent}%</span>
              {estimatedRemainingSec !== null && (
                <> · ~{estimatedRemainingSec}s left</>
              )}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-lg"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CHECKERBOARD = "repeating-conic-gradient(#e5e5e5 0% 25%, #f5f5f5 0% 50%) 50% / 16px 16px";
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_PRESETS = [0.5, 1, 2] as const;

export function CanvasStage() {
  const { state, dispatch, processor, processingAbortRef } = useEditor();
  const { isReady, isLoading, error: processorError, initialize } = useProcessor(processor);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const cropDragRef = useRef<{
    mode: "move" | "resize-se";
    startX: number;
    startY: number;
    startCrop: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const spacePressedRef = useRef(false);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressedRef.current = true;
        setIsSpacePressed(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressedRef.current = false;
        setIsSpacePressed(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (state.status !== "ready" || state.frames.length === 0) return;
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const oldZoom = zoomRef.current;
      const step = e.deltaY > 0 ? -0.1 : 0.1;
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom + step));
      if (nextZoom === oldZoom) return;

      // Keep the cursor target stable while zooming.
      const cursorDx = e.clientX - (rect.left + rect.width / 2);
      const cursorDy = e.clientY - (rect.top + rect.height / 2);
      const currentPan = panRef.current;
      const scaleFactor = nextZoom / oldZoom;
      const nextPan = {
        x: cursorDx - (cursorDx - currentPan.x) * scaleFactor,
        y: cursorDy - (cursorDy - currentPan.y) * scaleFactor,
      };

      setPan(nextPan);
      setZoom(nextZoom);
    },
    [state.status, state.frames.length]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handlePanStart = useCallback((e: React.PointerEvent) => {
    const canPanWithButton = e.button === 1 || e.button === 2;
    const canPanWithSpace = e.button === 0 && spacePressedRef.current;
    if (!canPanWithButton && !canPanWithSpace) return;
    e.preventDefault();
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [pan.x, pan.y]);

  const handlePanMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + e.clientX - panStart.current.x,
      y: panStart.current.panY + e.clientY - panStart.current.y,
    });
  }, [isPanning]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const fitToView = useCallback(() => {
    const container = containerRef.current;
    const meta = state.metadata;
    if (!container || !meta || meta.width <= 0 || meta.height <= 0) return;
    const rect = container.getBoundingClientRect();
    const pad = 40;
    const fitZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.min((rect.width - pad) / meta.width, (rect.height - pad) / meta.height))
    );
    setZoom(fitZoom);
    setPan({ x: 0, y: 0 });
  }, [state.metadata]);

  const setZoomPreset = useCallback((preset: number) => {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, preset)));
  }, []);

  const updateCrop = useCallback((
    next: {
      x: number;
      y: number;
      width: number;
      height: number;
      aspectRatioPreset?: CropAspectPreset;
      rotation?: number;
      flipX?: boolean;
      flipY?: boolean;
    },
    changedKeys: string[] = []
  ) => {
    const meta = state.metadata;
    if (!meta) return;
    const ratio = ratioFromPreset(next.aspectRatioPreset);
    let width = Math.max(1, Math.round(next.width));
    let height = Math.max(1, Math.round(next.height));

    if (ratio) {
      if (changedKeys.includes("width") && !changedKeys.includes("height")) {
        height = Math.max(1, Math.round(width / ratio));
      } else if (changedKeys.includes("height") && !changedKeys.includes("width")) {
        width = Math.max(1, Math.round(height * ratio));
      } else {
        const hFromW = Math.max(1, Math.round(width / ratio));
        const wFromH = Math.max(1, Math.round(height * ratio));
        if (Math.abs(hFromW - height) <= Math.abs(wFromH - width)) height = hFromW;
        else width = wFromH;
      }
    }

    let x = Math.max(0, Math.min(meta.width - 1, Math.round(next.x)));
    let y = Math.max(0, Math.min(meta.height - 1, Math.round(next.y)));
    width = Math.max(1, Math.min(meta.width - x, width));
    height = Math.max(1, Math.min(meta.height - y, height));

    if (ratio) {
      const maxWidthByHeight = Math.max(1, Math.floor(height * ratio));
      const maxHeightByWidth = Math.max(1, Math.floor(width / ratio));
      if (maxWidthByHeight <= width) width = maxWidthByHeight;
      else height = maxHeightByWidth;
      width = Math.max(1, Math.min(meta.width - x, width));
      height = Math.max(1, Math.min(meta.height - y, height));
      if (x + width > meta.width) x = Math.max(0, meta.width - width);
      if (y + height > meta.height) y = Math.max(0, meta.height - height);
    }

    dispatch({
      type: "UPDATE_OUTPUT_SETTINGS",
      payload: {
        crop: {
          x,
          y,
          width,
          height,
          aspectRatioPreset: next.aspectRatioPreset ?? "free",
          rotation: (((next.rotation ?? 0) % 360) + 360) % 360,
          flipX: Boolean(next.flipX),
          flipY: Boolean(next.flipY),
        },
      },
    });
  }, [dispatch, state.metadata]);

  const handleCropPointerDown = useCallback(
    (e: React.PointerEvent, mode: "move" | "resize-se") => {
      if (state.activeTool !== "trim" || !state.outputSettings.crop) return;
      e.preventDefault();
      e.stopPropagation();
      cropDragRef.current = {
        mode,
        startX: e.clientX,
        startY: e.clientY,
        startCrop: { ...state.outputSettings.crop },
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [state.activeTool, state.outputSettings.crop]
  );

  const handleCropPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = cropDragRef.current;
      const meta = state.metadata;
      if (!drag || !meta) return;
      const dxPx = (e.clientX - drag.startX) / zoomRef.current;
      const dyPx = (e.clientY - drag.startY) / zoomRef.current;
      if (drag.mode === "move") {
        updateCrop({
          ...drag.startCrop,
          x: drag.startCrop.x + dxPx,
          y: drag.startCrop.y + dyPx,
        });
      } else {
        updateCrop({
          ...drag.startCrop,
          width: drag.startCrop.width + dxPx,
          height: drag.startCrop.height + dyPx,
        });
      }
    },
    [state.metadata, updateCrop]
  );

  const handleCropPointerUp = useCallback(() => {
    cropDragRef.current = null;
  }, []);

  useEffect(() => {
    if (state.status === "ready" && state.frames.length > 0 && canvasRef.current) {
      const canvas = canvasRef.current;
      const frame = state.frames[state.currentFrameIndex];
      if (!frame) return;
      const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio : 1);
      const w = frame.imageData.width;
      const h = frame.imageData.height;
      // Only resize the canvas element when dimensions actually change
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.putImageData(frame.imageData, 0, 0);
      }
    }
  }, [state.status, state.frames, state.currentFrameIndex]);

  const handleFileAccepted = async (file: File) => {
    dispatch({ type: "UPLOAD_START" });
    if (!processor) {
      dispatch({ type: "UPLOAD_ERROR", payload: ERROR_MESSAGES.WASM_LOAD_FAILED });
      return;
    }
    try {
      if (!processor.isReady) await initialize();
      const { decodeGif } = await import("@/core/application/commands/editor-commands");
      const { frames, metadata } = await decodeGif(processor, file);
      dispatch({ type: "UPLOAD_SUCCESS", payload: { file, frames, metadata } });
      dispatch({ type: "PROCESSOR_READY" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : ERROR_MESSAGES.PROCESSING_FAILED;
      dispatch({ type: "UPLOAD_ERROR", payload: msg });
    }
  };

  if (state.status === "empty") {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <UploadZone
          onFileAccepted={handleFileAccepted}
          onError={(msg) => dispatch({ type: "UPLOAD_ERROR", payload: msg })}
        />
      </div>
    );
  }

  if (state.status === "loading" || (state.status === "ready" && !state.frames.length)) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <SkeletonLoader />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="rounded-xl border border-border/50 bg-muted/30 p-4 max-w-md text-center">
          <p className="text-sm text-foreground mb-3">{state.error}</p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => dispatch({ type: "RESET" })}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (state.status === "processing") {
    return (
      <ExportProgressOverlay
        progress={state.processingProgress}
        onCancel={() => processingAbortRef.current?.abort()}
      />
    );
  }

  const frame = state.frames[state.currentFrameIndex];
  const w = state.metadata?.width ?? 0;
  const h = state.metadata?.height ?? 0;

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center h-full bg-muted/20 rounded-xl overflow-hidden relative"
      onPointerDown={handlePanStart}
      onPointerMove={(e) => {
        handlePanMove(e);
        handleCropPointerMove(e);
      }}
      onPointerUp={() => {
        handlePanEnd();
        handleCropPointerUp();
      }}
      onPointerLeave={() => {
        handlePanEnd();
        handleCropPointerUp();
      }}
      onContextMenu={(e) => e.preventDefault()}
      style={{ cursor: isPanning ? "grabbing" : isSpacePressed ? "grab" : undefined }}
    >
      <div
        className="relative rounded-lg overflow-visible shadow-sm border border-border/50"
        style={{
          background: CHECKERBOARD,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <div className="absolute -top-8 right-0 flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs rounded-lg"
            onClick={fitToView}
          >
            Fit
          </Button>
          {ZOOM_PRESETS.map((preset) => (
            <Button
              key={preset}
              variant={Math.abs(zoom - preset) < 0.01 ? "default" : "secondary"}
              size="sm"
              className="h-7 text-xs rounded-lg min-w-[3rem]"
              onClick={() => setZoomPreset(preset)}
            >
              {Math.round(preset * 100)}%
            </Button>
          ))}
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs rounded-lg"
            onClick={resetView}
          >
            Reset view
          </Button>
          <span className="text-xs text-muted-foreground self-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
        </div>
        <canvas
          ref={canvasRef}
          className="block max-w-full max-h-full"
          style={{ width: w, height: h }}
        />
        {state.activeTool === "trim" && state.outputSettings.crop && (
          <>
            <div
              className="absolute bg-black/45 pointer-events-none"
              style={{ left: 0, top: 0, width: w, height: state.outputSettings.crop.y, zIndex: 30 }}
            />
            <div
              className="absolute bg-black/45 pointer-events-none"
              style={{
                left: 0,
                top: state.outputSettings.crop.y + state.outputSettings.crop.height,
                width: w,
                height: h - (state.outputSettings.crop.y + state.outputSettings.crop.height),
                zIndex: 30,
              }}
            />
            <div
              className="absolute bg-black/45 pointer-events-none"
              style={{
                left: 0,
                top: state.outputSettings.crop.y,
                width: state.outputSettings.crop.x,
                height: state.outputSettings.crop.height,
                zIndex: 30,
              }}
            />
            <div
              className="absolute bg-black/45 pointer-events-none"
              style={{
                left: state.outputSettings.crop.x + state.outputSettings.crop.width,
                top: state.outputSettings.crop.y,
                width: w - (state.outputSettings.crop.x + state.outputSettings.crop.width),
                height: state.outputSettings.crop.height,
                zIndex: 30,
              }}
            />
            <div
              className="absolute border-2 border-primary/90 bg-primary/10"
              style={{
                left: state.outputSettings.crop.x,
                top: state.outputSettings.crop.y,
                width: state.outputSettings.crop.width,
                height: state.outputSettings.crop.height,
                cursor: "move",
                zIndex: 40,
              }}
              onPointerDown={(e) => handleCropPointerDown(e, "move")}
            >
              <div className="absolute -top-5 left-0 rounded bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5">
                Crop
              </div>
              <button
                type="button"
                aria-label="Resize crop"
                className="absolute -right-1.5 -bottom-1.5 h-3.5 w-3.5 rounded-sm bg-primary border border-primary-foreground/50"
                style={{ cursor: "nwse-resize" }}
                onPointerDown={(e) => handleCropPointerDown(e, "resize-se")}
              />
            </div>
          </>
        )}
        {frame && (
          <OverlayRenderer
            overlays={state.overlays}
            currentFrameIndex={state.currentFrameIndex}
            frameCount={state.frames.length}
            width={w}
            height={h}
          />
        )}
      </div>
    </div>
  );
}
