"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { UploadZone } from "./upload-zone";
import { SkeletonLoader } from "./skeleton-loader";
import { OverlayRenderer } from "./overlay-renderer";
import { useEditor } from "@/hooks/use-editor";
import { useProcessor } from "@/hooks/use-processor";
import { ERROR_MESSAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";
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

export function CanvasStage() {
  const { state, dispatch, processor, processingAbortRef } = useEditor();
  const { isReady, isLoading, error: processorError, initialize } = useProcessor(processor);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (state.status !== "ready" || state.frames.length === 0) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
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
    if (e.button !== 1 && e.button !== 2) return; // middle or right
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
      onPointerMove={handlePanMove}
      onPointerUp={handlePanEnd}
      onPointerLeave={handlePanEnd}
      style={{ cursor: isPanning ? "grabbing" : undefined }}
    >
      <div
        className="relative rounded-lg overflow-visible shadow-sm border border-border/50"
        style={{
          background: CHECKERBOARD,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <div className="absolute -top-8 right-0 flex gap-1">
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
