"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useEditor } from "@/hooks/use-editor";
import {
  exportGif,
  exportGifWithOverlays,
  triggerDownload,
} from "@/core/application/commands/editor-commands";
import { ERROR_MESSAGES } from "@/lib/constants";
import { RESIZE_PRESETS } from "@/core/domain/presets";
import { formatBytes, cn } from "@/lib/utils";
import { EDITOR_LABELS } from "@/lib/i18n/editor-labels";
import {
  ExportDiagnosticsModal,
  type ExportDiagnostics,
} from "./export-diagnostics-modal";

export function ExportButton() {
  const { state, processor, dispatch, processingAbortRef } = useEditor();
  const [exporting, setExporting] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<ExportDiagnostics | null>(null);

  const canExport =
    !!state.file &&
    !!state.metadata &&
    !!processor &&
    state.status !== "loading" &&
    state.status !== "processing";

  const estimatedOutputSize = useMemo(() => {
    if (!state.metadata) return null;
    const sourceArea = Math.max(1, state.metadata.width * state.metadata.height);
    const outputWidth = state.outputSettings.width || state.metadata.width;
    const outputHeight = state.outputSettings.height || state.metadata.height;
    const outputArea = Math.max(1, outputWidth * outputHeight);
    const areaScale = outputArea / sourceArea;

    const totalFrames = Math.max(1, state.frames.length);
    const trimmedFrames = Math.max(1, state.trimEnd - state.trimStart + 1);
    const frameScale = trimmedFrames / totalFrames;

    const qualityScale = Math.max(0.45, Math.min(1.25, state.outputSettings.quality / 80));
    const overlayScale = 1 + Math.min(0.35, state.overlays.filter((o) => o.visible !== false).length * 0.03);

    return Math.max(
      1024,
      Math.round(state.metadata.fileSize * areaScale * frameScale * qualityScale * overlayScale)
    );
  }, [
    state.metadata,
    state.outputSettings.width,
    state.outputSettings.height,
    state.outputSettings.quality,
    state.frames.length,
    state.trimStart,
    state.trimEnd,
    state.overlays,
  ]);

  const applyExportPreset = useCallback(
    (presetId: string) => {
      if (!state.metadata) return;
      const preset = RESIZE_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      if (preset.id === "original" || !preset.width) {
        dispatch({
          type: "UPDATE_OUTPUT_SETTINGS",
          payload: { width: state.metadata.width, height: state.metadata.height },
        });
        return;
      }
      const aspect = state.metadata.height / state.metadata.width;
      const width = preset.width;
      const height = preset.height ?? Math.max(1, Math.round(width * aspect));
      dispatch({
        type: "UPDATE_OUTPUT_SETTINGS",
        payload: { width, height },
      });
    },
    [dispatch, state.metadata]
  );

  const buildDiagnostics = useCallback(
    (message: string): ExportDiagnostics => {
      const safeMeta = state.metadata;
      const width = state.outputSettings.width || safeMeta?.width || 0;
      const height = state.outputSettings.height || safeMeta?.height || 0;
      return {
        message,
        context: [
          {
            label: "Project",
            value: state.projectName || state.file?.name || "Untitled",
          },
          {
            label: "Source",
            value: safeMeta
              ? `${safeMeta.width}x${safeMeta.height}, ${safeMeta.frameCount} frames, ${formatBytes(safeMeta.fileSize)}`
              : "Unknown",
          },
          {
            label: "Output",
            value: `${width}x${height}, q${state.outputSettings.quality}`,
          },
          {
            label: "Trim range",
            value: `${state.trimStart + 1}-${state.trimEnd + 1}`,
          },
          {
            label: "Visible overlays",
            value: String(state.overlays.filter((o) => o.visible !== false).length),
          },
          {
            label: "Browser",
            value: typeof navigator === "undefined" ? "Unknown" : navigator.userAgent,
          },
        ],
      };
    },
    [
      state.metadata,
      state.outputSettings.width,
      state.outputSettings.height,
      state.outputSettings.quality,
      state.projectName,
      state.file,
      state.trimStart,
      state.trimEnd,
      state.overlays,
    ]
  );

  const runExport = useCallback(
    async (overrides?: Partial<typeof state.outputSettings>) => {
      if (!state.file || !processor || !state.metadata) return;
      const outputSettings = { ...state.outputSettings, ...overrides };
      setExporting(true);
      const controller = new AbortController();
      processingAbortRef.current = controller;
      dispatch({ type: "PROCESSING_START" });
      try {
        processor.onProgress((p) => dispatch({ type: "PROCESSING_PROGRESS", payload: p }));
        const visibleOverlays = state.overlays.filter((o) => o.visible !== false);
        const result =
          visibleOverlays.length > 0
            ? await exportGifWithOverlays(
                processor,
                state.file,
                outputSettings,
                visibleOverlays,
                state.frames.length,
                state.trimStart,
                state.trimEnd,
                controller.signal
              )
            : await exportGif(
                processor,
                state.file,
                outputSettings,
                state.frames.length,
                state.trimStart,
                state.trimEnd,
                controller.signal
              );
        dispatch({ type: "PROCESSING_DONE" });
        setDiagnosticsOpen(false);
        const baseProject = (state.projectName || state.file.name.replace(/\.[^.]+$/, "") || "gifalchemy")
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9-_]/g, "")
          .toLowerCase();
        const width = result.width || outputSettings.width || state.metadata.width;
        const height = result.height || outputSettings.height || state.metadata.height;
        const name = `${baseProject}-${width}x${height}.${result.format}`;
        triggerDownload(result.blob, name);
        toast.success(EDITOR_LABELS.export.doneToast);
      } catch (e) {
        const isAbort = e instanceof DOMException && e.name === "AbortError";
        if (isAbort) {
          dispatch({ type: "PROCESSING_DONE" });
          toast.info(EDITOR_LABELS.export.cancelledToast);
        } else {
          const fallback = ERROR_MESSAGES.PROCESSING_FAILED;
          const message = e instanceof Error ? e.message : fallback;
          dispatch({
            type: "PROCESSING_ERROR",
            payload: message,
          });
          setDiagnostics(buildDiagnostics(message));
          setDiagnosticsOpen(true);
          toast.error(EDITOR_LABELS.export.failedToastTitle, {
            description: `${message} ${EDITOR_LABELS.export.failedToastDescription}`,
          });
        }
      } finally {
        processingAbortRef.current = null;
        setExporting(false);
      }
    },
    [buildDiagnostics, dispatch, processingAbortRef, processor, state]
  );

  const handleExport = useCallback(async () => {
    await runExport();
  }, [runExport]);

  const handleRetrySafer = useCallback(() => {
    if (!state.metadata) return;
    const currentWidth = state.outputSettings.width || state.metadata.width;
    const currentHeight = state.outputSettings.height || state.metadata.height;
    const nextWidth = Math.max(64, Math.round(currentWidth * 0.8));
    const nextHeight = Math.max(64, Math.round(currentHeight * 0.8));
    const nextQuality = Math.max(45, state.outputSettings.quality - 15);
    const safer = { width: nextWidth, height: nextHeight, quality: nextQuality };
    dispatch({ type: "UPDATE_OUTPUT_SETTINGS", payload: safer });
    void runExport(safer);
  }, [dispatch, runExport, state.metadata, state.outputSettings.height, state.outputSettings.quality, state.outputSettings.width]);

  useEffect(() => {
    const onExportRequest = () => {
      if (!canExport || exporting) return;
      void handleExport();
    };
    window.addEventListener("gifalchemy:export-request", onExportRequest);
    return () => window.removeEventListener("gifalchemy:export-request", onExportRequest);
  }, [canExport, exporting, handleExport]);

  return (
    <>
      <div className="flex items-center gap-3">
        {state.metadata && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 h-8 rounded-[8px] border border-white/5 bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/40 whitespace-nowrap">
              EST. {estimatedOutputSize ? formatBytes(estimatedOutputSize) : EDITOR_LABELS.export.estimateUnknown}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Select onValueChange={applyExportPreset} disabled={!state.metadata || exporting}>
            <SelectTrigger className="h-9 w-[110px] rounded-[8px] border border-white/10 bg-white/[0.04] px-3 text-[10px] font-black uppercase tracking-widest text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 hover:bg-white/[0.08] hover:text-white focus:ring-1 focus:ring-primary/40 focus:ring-offset-1 focus:ring-offset-black/50" aria-label={EDITOR_LABELS.export.presetPlaceholder}>
              <SelectValue placeholder={EDITOR_LABELS.export.presetPlaceholder} />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#121212]/95 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] text-white/90">
              {RESIZE_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id} className="focus:bg-white/10 focus:text-white rounded-md mx-1 my-0.5 max-w-[calc(100%-8px)]">
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {diagnostics ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-[8px] focus-visible:ring-1 focus-visible:ring-amber-500/50"
              onClick={() => setDiagnosticsOpen(true)}
              aria-label={EDITOR_LABELS.export.diagnosticsAriaOpen}
              title={EDITOR_LABELS.export.diagnosticsTitle}
            >
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </Button>
          ) : null}

          <Button
            variant="default"
            size="sm"
            className={cn(
              "group relative h-9 overflow-hidden rounded-[8px] px-6 text-[10.5px] font-black uppercase tracking-[0.15em] text-white shadow-[0_6px_15px_-4px_rgba(var(--primary-rgb),0.5),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all duration-500",
              !exporting && "hover:shadow-[0_10px_24px_-4px_rgba(var(--primary-rgb),0.7),inset_0_1px_0_rgba(255,255,255,0.4)] hover:scale-[1.02] active:scale-[0.98]",
              exporting && "w-[180px] cursor-wait opacity-100 shadow-[0_0_30px_-5px_var(--primary)]",
              !canExport && !exporting && "opacity-50 hover:scale-100 hover:shadow-none",
              "focus-visible:ring-1 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black min-w-[120px]"
            )}
            disabled={!canExport || exporting}
            onClick={handleExport}
            aria-label={exporting ? EDITOR_LABELS.export.primaryBusy : EDITOR_LABELS.export.primaryIdle}
          >
            {/* Dynamic animated gradient background */}
            {!exporting && (
              <div className="absolute inset-0 bg-[linear-gradient(110deg,#ec4899,45%,#a855f7,55%,#ec4899)] bg-[length:200%_100%] animate-shimmer opacity-95 transition-opacity group-hover:opacity-100" />
            )}

            {/* Premium Liquid Processing Background */}
            {exporting && (
              <>
                <div 
                  className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,var(--primary),#3b82f6)] transition-all duration-300 ease-out" 
                  style={{ width: `${Number(state.processingProgress || 0) * 100}%` }}
                />
                <div 
                  className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] mix-blend-overlay" 
                />
                {/* Intense Edge Glow on Progress Bar */}
                <div 
                  className="absolute inset-y-0 w-12 blur-md bg-white/50 mix-blend-overlay transition-all duration-300"
                  style={{ left: `calc(${Number(state.processingProgress || 0) * 100}% - 24px)` }}
                />
              </>
            )}

            {/* Subtle inner top highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-white/30 mix-blend-overlay" />
            
            <div className="relative z-10 flex items-center justify-center gap-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] w-full w-max">
              {exporting ? (
                 <>
                   <span className="text-[11px] font-extrabold tracking-[0.2em] text-white">
                     PROCESSING
                   </span>
                   <span className="text-[12px] font-mono text-white/90 translate-y-[0.5px]">
                     {Math.round(Number(state.processingProgress || 0) * 100)}%
                   </span>
                 </>
              ) : (
                 <>
                   <span className="relative flex items-center justify-center h-4 w-4">
                     <Download className="absolute h-3.5 w-3.5 text-white group-hover:-translate-y-[2px] opacity-100 group-hover:opacity-0 transition-all duration-300" />
                     <Download className="absolute h-3.5 w-3.5 text-white translate-y-[8px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75" />
                   </span>
                   <span>{EDITOR_LABELS.export.primaryIdle}</span>
                 </>
              )}
            </div>
          </Button>
        </div>
      </div>

      <ExportDiagnosticsModal
        open={diagnosticsOpen}
        diagnostics={diagnostics}
        onClose={() => setDiagnosticsOpen(false)}
        onRetry={() => void runExport()}
        onRetrySafer={handleRetrySafer}
        busy={exporting}
      />
    </>
  );
}
