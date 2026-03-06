"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Eye, ImageIcon, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { UploadZone } from "./upload-zone";
import { SkeletonLoader } from "./skeleton-loader";
import { OverlayRenderer } from "./overlay-renderer";
import { FloatingTextToolbar } from "./floating-text-toolbar";
import { useEditor } from "@/hooks/use-editor";
import { useProcessor } from "@/hooks/use-processor";
import { ERROR_MESSAGES } from "@/lib/constants";
import { cn, formatBytes } from "@/lib/utils";
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

const UPLOAD_STORAGE_KEY = "gifalchemy:uploads";
const MAX_RECENT = 6;

interface RecentUpload {
  name: string;
  size: number;
  dataUrl?: string;
  addedAt: number;
}

function readRecentUploads(): RecentUpload[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(UPLOAD_STORAGE_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentUpload(entry: RecentUpload): void {
  try {
    const existing = readRecentUploads().filter((e) => e.name !== entry.name);
    const next = [entry, ...existing].slice(0, MAX_RECENT);
    localStorage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
}

function makeThumbnailDataUrl(imageData: ImageData, maxSize = 80): string {
  try {
    const canvas = document.createElement("canvas");
    const aspect = imageData.width / imageData.height;
    if (aspect >= 1) {
      canvas.width = maxSize;
      canvas.height = Math.round(maxSize / aspect);
    } else {
      canvas.height = maxSize;
      canvas.width = Math.round(maxSize * aspect);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    const temp = document.createElement("canvas");
    temp.width = imageData.width;
    temp.height = imageData.height;
    const tctx = temp.getContext("2d");
    if (!tctx) return "";
    tctx.putImageData(imageData, 0, 0);
    ctx.drawImage(temp, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

function EmptyUploadView({
  onFileAccepted,
  onError,
}: {
  onFileAccepted: (file: File) => void;
  onError: (msg: string) => void;
}) {
  const [recentUploads] = useState<RecentUpload[]>(() => readRecentUploads().slice(0, MAX_RECENT));

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-6 overflow-auto">
      <UploadZone onFileAccepted={onFileAccepted} onError={onError} />

      {recentUploads.length > 0 && (
        <div className="w-full max-w-xl">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
            Recent uploads
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {recentUploads.map((item) => (
              <div
                key={`${item.name}-${item.addedAt}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card/70 transition-colors hover:border-border hover:bg-card"
              >
                <div className="relative flex h-20 items-center justify-center overflow-hidden bg-[repeating-conic-gradient(#1a1a1e_0%_25%,#242428_0%_50%)_50%_/_12px_12px]">
                  {item.dataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.dataUrl}
                      alt={item.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/40">
                      <ImageIcon className="h-5 w-5 text-muted-foreground/60" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 px-2 py-1.5">
                  <p
                    className="truncate text-[11px] font-medium text-foreground/90"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                  <p className="text-[10px] tabular-nums text-muted-foreground/70">
                    {formatBytes(item.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const CHECKERBOARD = "repeating-conic-gradient(#17191e 0% 25%, #1f2228 0% 50%) 50% / 16px 16px";
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.05;
const RULER_SIZE = 18;
type CropDragMode = "move" | "n" | "s" | "w" | "e" | "nw" | "ne" | "sw" | "se";

export function CanvasStage() {
  const { state, dispatch, processor, processingAbortRef } = useEditor();
  const { isReady, isLoading, error: processorError, initialize } = useProcessor(processor);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [showRulers, setShowRulers] = useState(true);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const cropDragRef = useRef<{
    mode: CropDragMode;
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPreviewMode) setIsPreviewMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPreviewMode]);


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

  const clampZoom = useCallback((nextZoom: number) => {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
  }, []);

  const setZoomLevel = useCallback((nextZoom: number) => {
    setZoom(clampZoom(nextZoom));
  }, [clampZoom]);

  const adjustZoom = useCallback((delta: number) => {
    setZoom((prev) => clampZoom(prev + delta));
  }, [clampZoom]);

  const updateCrop = useCallback((next: { x: number; y: number; width: number; height: number }) => {
    const meta = state.metadata;
    if (!meta) return;
    const x = Math.max(0, Math.min(meta.width - 1, Math.round(next.x)));
    const y = Math.max(0, Math.min(meta.height - 1, Math.round(next.y)));
    const width = Math.max(1, Math.min(meta.width - x, Math.round(next.width)));
    const height = Math.max(1, Math.min(meta.height - y, Math.round(next.height)));
    dispatch({
      type: "UPDATE_OUTPUT_SETTINGS",
      payload: { crop: { x, y, width, height } },
    });
  }, [dispatch, state.metadata]);

  const handleCropPointerDown = useCallback(
    (e: React.PointerEvent, mode: CropDragMode) => {
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
      const minSize = 1;

      if (drag.mode === "move") {
        const nextX = Math.max(
          0,
          Math.min(meta.width - drag.startCrop.width, drag.startCrop.x + dxPx)
        );
        const nextY = Math.max(
          0,
          Math.min(meta.height - drag.startCrop.height, drag.startCrop.y + dyPx)
        );
        updateCrop({
          ...drag.startCrop,
          x: nextX,
          y: nextY,
        });
        return;
      }

      const startLeft = drag.startCrop.x;
      const startTop = drag.startCrop.y;
      const startRight = drag.startCrop.x + drag.startCrop.width;
      const startBottom = drag.startCrop.y + drag.startCrop.height;
      let left = startLeft;
      let top = startTop;
      let right = startRight;
      let bottom = startBottom;

      if (drag.mode.includes("w")) {
        left = Math.max(0, Math.min(startRight - minSize, startLeft + dxPx));
      }
      if (drag.mode.includes("e")) {
        right = Math.min(meta.width, Math.max(startLeft + minSize, startRight + dxPx));
      }
      if (drag.mode.includes("n")) {
        top = Math.max(0, Math.min(startBottom - minSize, startTop + dyPx));
      }
      if (drag.mode.includes("s")) {
        bottom = Math.min(meta.height, Math.max(startTop + minSize, startBottom + dyPx));
      }

      updateCrop({
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      });
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
      const startedAt = performance.now();
      const { frames, metadata } = await decodeGif(processor, file);
      const decodeMs = Math.max(0, performance.now() - startedAt);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("gifalchemy:decode-profile", {
            detail: {
              decodeMs,
              frameCount: frames.length,
              width: metadata.width,
              height: metadata.height,
              at: Date.now(),
            },
          })
        );
      }
      dispatch({ type: "UPLOAD_SUCCESS", payload: { file, frames, metadata } });
      dispatch({ type: "PROCESSOR_READY" });
      const dataUrl = frames[0] ? makeThumbnailDataUrl(frames[0].imageData) : "";
      saveRecentUpload({
        name: file.name,
        size: file.size,
        addedAt: Date.now(),
        dataUrl: dataUrl || undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : ERROR_MESSAGES.PROCESSING_FAILED;
      dispatch({ type: "UPLOAD_ERROR", payload: msg });
    }
  };

  if (state.status === "empty") {
    return (
      <EmptyUploadView
        onFileAccepted={handleFileAccepted}
        onError={(msg) => dispatch({ type: "UPLOAD_ERROR", payload: msg })}
      />
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
  const lastFrame = Math.max(0, state.frames.length - 1);
  const overlaysInRange = state.overlays.filter((overlay) => {
    const inFrame = Math.max(0, Math.min(lastFrame, overlay.inFrame ?? 0));
    const outFrame = Math.max(inFrame, Math.min(lastFrame, overlay.outFrame ?? lastFrame));
    return state.currentFrameIndex >= inFrame && state.currentFrameIndex <= outFrame;
  });
  const crop = state.outputSettings.crop;

  const effectiveShowRulers = isPreviewMode ? false : showRulers;
  const effectiveShowSafeArea = isPreviewMode ? false : showSafeArea;

  const cropHandleStyles: Array<{ mode: CropDragMode; cursor: string; className: string; ariaLabel: string }> = [
    { mode: "nw", cursor: "nwse-resize", className: "-left-1.5 -top-1.5", ariaLabel: "Resize crop top left" },
    { mode: "n", cursor: "ns-resize", className: "left-1/2 -translate-x-1/2 -top-1.5", ariaLabel: "Resize crop top edge" },
    { mode: "ne", cursor: "nesw-resize", className: "-right-1.5 -top-1.5", ariaLabel: "Resize crop top right" },
    { mode: "w", cursor: "ew-resize", className: "-left-1.5 top-1/2 -translate-y-1/2", ariaLabel: "Resize crop left edge" },
    { mode: "e", cursor: "ew-resize", className: "-right-1.5 top-1/2 -translate-y-1/2", ariaLabel: "Resize crop right edge" },
    { mode: "sw", cursor: "nesw-resize", className: "-left-1.5 -bottom-1.5", ariaLabel: "Resize crop bottom left" },
    { mode: "s", cursor: "ns-resize", className: "left-1/2 -translate-x-1/2 -bottom-1.5", ariaLabel: "Resize crop bottom edge" },
    { mode: "se", cursor: "nwse-resize", className: "-right-1.5 -bottom-1.5", ariaLabel: "Resize crop bottom right" },
  ];
  const horizontalTicks = Array.from({ length: Math.floor(w / 20) + 1 }, (_, i) => i * 20);
  const verticalTicks = Array.from({ length: Math.floor(h / 20) + 1 }, (_, i) => i * 20);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-full items-center justify-center overflow-hidden rounded-xl",
        isPreviewMode ? "bg-black" : "bg-[#080a10]"
      )}
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
      {!isPreviewMode && (
        <>
          <div
            className="pointer-events-none absolute inset-0 rounded-xl opacity-45"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(15,18,26,0.9), rgba(8,10,16,0.95)), linear-gradient(rgba(122,138,162,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(122,138,162,0.06) 1px, transparent 1px)",
              backgroundSize: "100% 100%, 24px 24px, 24px 24px",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              background:
                "radial-gradient(circle at 50% 48%, rgba(176,198,230,0.12) 0%, rgba(15,18,26,0.28) 50%, rgba(4,6,10,0.74) 100%)",
            }}
          />
        </>
      )}
      <div
        className="relative overflow-visible rounded-[10px] border border-white/12 shadow-[0_16px_46px_rgba(0,0,0,0.46),0_1px_0_rgba(255,255,255,0.05)_inset] transition-shadow duration-200"
        style={{
          background: isPreviewMode ? "#0a0a0a" : CHECKERBOARD,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        {!isPreviewMode && (
          <div
            className="pointer-events-none absolute -inset-10 rounded-[18px] -z-10"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(148,170,204,0.18) 0%, rgba(66,78,98,0.12) 35%, rgba(12,14,20,0) 72%)",
            }}
          />
        )}
        <div
          className="pointer-events-none absolute inset-0 rounded-[10px]"
          style={{
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.045), inset 0 0 28px rgba(14,20,32,0.34)",
          }}
        />
        <canvas
          ref={canvasRef}
          className="block max-w-full max-h-full"
          style={{ width: w, height: h }}
        />
        {effectiveShowRulers && (
          <>
            <div
              className="absolute left-0 bg-card/90 border-b border-border/70 pointer-events-none"
              style={{ top: -RULER_SIZE, width: w, height: RULER_SIZE, zIndex: 35 }}
            >
              {horizontalTicks.map((tick) => {
                const isMajor = tick % 100 === 0;
                return (
                  <div
                    key={`x-${tick}`}
                    className="absolute top-0"
                    style={{ left: tick }}
                  >
                    <div
                      className={cn("w-px bg-border/90", isMajor ? "h-4" : "h-2")}
                    />
                    {isMajor && (
                      <span className="absolute top-[2px] left-1 text-[9px] leading-none text-muted-foreground/90">
                        {tick}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div
              className="absolute top-0 bg-card/90 border-r border-border/70 pointer-events-none"
              style={{ left: -RULER_SIZE, width: RULER_SIZE, height: h, zIndex: 35 }}
            >
              {verticalTicks.map((tick) => {
                const isMajor = tick % 100 === 0;
                return (
                  <div
                    key={`y-${tick}`}
                    className="absolute left-0"
                    style={{ top: tick }}
                  >
                    <div
                      className={cn("h-px bg-border/90", isMajor ? "w-4" : "w-2")}
                    />
                    {isMajor && (
                      <span
                        className="absolute left-[2px] top-1 text-[9px] leading-none text-muted-foreground/90 [writing-mode:vertical-rl]"
                      >
                        {tick}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div
              className="absolute bg-card border border-border/70 pointer-events-none"
              style={{ left: -RULER_SIZE, top: -RULER_SIZE, width: RULER_SIZE, height: RULER_SIZE, zIndex: 36 }}
            />
          </>
        )}
        {effectiveShowSafeArea && (
          <>
            <div
              className="absolute border border-amber-400/90 border-dashed pointer-events-none"
              style={{
                left: `${w * 0.05}px`,
                top: `${h * 0.05}px`,
                width: `${w * 0.9}px`,
                height: `${h * 0.9}px`,
                zIndex: 34,
              }}
            />
            <div
              className="absolute border border-emerald-400/90 border-dashed pointer-events-none"
              style={{
                left: `${w * 0.1}px`,
                top: `${h * 0.1}px`,
                width: `${w * 0.8}px`,
                height: `${h * 0.8}px`,
                zIndex: 34,
              }}
            />
          </>
        )}
        {!isPreviewMode && state.activeTool === "trim" && crop && (
          <>
            <div
              className="absolute bg-black/45 pointer-events-none"
              style={{ left: 0, top: 0, width: w, height: crop.y, zIndex: 30 }}
            />
            <div
              className="absolute bg-black/45 pointer-events-none"
              style={{
                left: 0,
                top: crop.y + crop.height,
                width: w,
                height: h - (crop.y + crop.height),
                zIndex: 30,
              }}
            />
            <div
              className="absolute bg-black/45 pointer-events-none"
              style={{
                left: 0,
                top: crop.y,
                width: crop.x,
                height: crop.height,
                zIndex: 30,
              }}
            />
            <div
              className="absolute bg-black/45 pointer-events-none"
              style={{
                left: crop.x + crop.width,
                top: crop.y,
                width: w - (crop.x + crop.width),
                height: crop.height,
                zIndex: 30,
              }}
            />
            <div
              className="absolute border-2 border-primary/90 bg-primary/10"
              style={{
                left: crop.x,
                top: crop.y,
                width: crop.width,
                height: crop.height,
                cursor: "move",
                zIndex: 40,
              }}
              onPointerDown={(e) => handleCropPointerDown(e, "move")}
            >
              <div className="absolute -top-5 left-0 rounded bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5">
                Crop
              </div>
              {cropHandleStyles.map((handle) => (
                <button
                  key={handle.mode}
                  type="button"
                  aria-label={handle.ariaLabel}
                  className={cn(
                    "absolute h-3.5 w-3.5 rounded-sm bg-primary border border-primary-foreground/50",
                    handle.className
                  )}
                  style={{ cursor: handle.cursor }}
                  onPointerDown={(e) => handleCropPointerDown(e, handle.mode)}
                />
              ))}
            </div>
          </>
        )}
        {frame && (
          <OverlayRenderer
            overlays={overlaysInRange}
            currentFrameIndex={state.currentFrameIndex}
            frameCount={state.frames.length}
            width={w}
            height={h}
            previewMode={isPreviewMode}
          />
        )}
      </div>

      {/* Preview mode top bar */}
      {isPreviewMode && (
        <div className="pointer-events-auto absolute inset-x-0 top-0 z-50 flex items-center justify-between rounded-t-xl border-b border-white/15 bg-black/55 px-4 py-2 backdrop-blur-md">
          <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-white/60">Preview</span>
          <button
            type="button"
            onClick={() => setIsPreviewMode(false)}
            className="flex items-center gap-1 text-[11px] text-white/60 transition-colors duration-150 hover:text-white"
          >
            <X className="h-3 w-3" />
            Exit
          </button>
        </div>
      )}

      {/* Floating zoom bar — bottom-right so it stays away from canvas media */}
      <div
        className={cn(
          "absolute bottom-4 right-4 z-[100] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)]/95 px-2 py-2 shadow-[var(--shadow-md)] backdrop-blur-sm transition-opacity duration-[var(--duration-ui)]",
          isPreviewMode && "opacity-60"
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-inset)]/80 px-1.5 py-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="Zoom out"
                onClick={() => adjustZoom(-ZOOM_STEP)}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <div className="w-24 px-1 sm:w-32">
                <Slider
                  aria-label="Canvas zoom"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={ZOOM_STEP}
                  value={[zoom]}
                  onValueChange={([nextZoom]) => setZoomLevel(nextZoom)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="Zoom in"
                onClick={() => adjustZoom(ZOOM_STEP)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <span
              className={cn(
                "w-10 text-center text-xs font-medium tabular-nums",
                Math.abs(zoom - 1) < 0.01 ? "text-[var(--text-muted)]" : "text-[var(--primary)]"
              )}
            >
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="sm" className="h-7 rounded-md px-2 text-xs" onClick={fitToView}>
              Fit
            </Button>
            <Button variant="ghost" size="sm" className="h-7 rounded-md px-2 text-xs" onClick={resetView}>
              Reset
            </Button>
            <div className="flex items-center gap-0.5 border-l border-[var(--border-subtle)] pl-2">
              <Button
                variant={showRulers ? "secondary" : "ghost"}
                size="sm"
                className="h-7 rounded-md px-2 text-xs"
                onClick={() => setShowRulers((v) => !v)}
              >
                Rulers
              </Button>
              <Button
                variant={showSafeArea ? "secondary" : "ghost"}
                size="sm"
                className="h-7 rounded-md px-2 text-xs"
                onClick={() => setShowSafeArea((v) => !v)}
              >
                Safe
              </Button>
              <Button
                variant={isPreviewMode ? "secondary" : "ghost"}
                size="sm"
                className="h-7 gap-1 rounded-md px-2 text-xs"
                onClick={() => setIsPreviewMode((v) => !v)}
              >
                <Eye className="h-3.5 w-3.5" />
                {isPreviewMode ? "Exit" : "Preview"}
              </Button>
              <span
                className={cn(
                  "inline-flex h-7 items-center rounded-md border px-2 text-xs",
                  state.snapToGrid
                    ? "border-[var(--primary)]/50 bg-[var(--primary)]/20 text-[var(--primary)]"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                )}
                title="Arrow-key nudge snapping"
              >
                Snap {state.snapToGrid ? "8px" : "off"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {!isPreviewMode && <FloatingTextToolbar />}
    </div>
  );
}
