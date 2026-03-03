"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { AlertTriangle, Download, ListPlus, Play, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatBytes } from "@/lib/utils";
import { EDITOR_LABELS } from "@/lib/i18n/editor-labels";
import { useTelemetry } from "@/hooks/use-telemetry";
import { ExportDiagnosticsModal, type ExportDiagnostics } from "./export-diagnostics-modal";
import type { OutputFormat } from "@/core/domain/gif-types";
import type { OutputSettings } from "@/core/domain/project";

interface PhaseMarkers {
  startedAt: number;
  decodingAt: number | null;
  compositingAt: number | null;
  encodingAt: number | null;
}

interface ExportPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  format: OutputFormat;
  createdAt: number;
}

type QueueStatus = "queued" | "exporting" | "done" | "error";

interface ExportQueueItem {
  id: string;
  width: number;
  height: number;
  requestedFormat: OutputFormat;
  status: QueueStatus;
  note?: string;
}

interface ExportResultInfo {
  success: boolean;
  message: string;
  usedFallback: boolean;
}

const CUSTOM_PRESETS_KEY = "gifalchemy-export-presets:v1";

const FORMAT_OPTIONS: Array<{ value: OutputFormat; label: string }> = [
  { value: "gif", label: "GIF" },
  { value: "apng", label: "APNG" },
  { value: "mp4", label: "MP4" },
  { value: "webm", label: "WebM" },
];

const FORMAT_SUPPORT: Record<OutputFormat, { native: boolean; fallback: OutputFormat; reason: string }> = {
  gif: { native: true, fallback: "gif", reason: "Native GIF export is available." },
  apng: { native: false, fallback: "gif", reason: "APNG encoder is not available in this build." },
  mp4: { native: false, fallback: "gif", reason: "MP4 export is not available in this build." },
  webm: { native: false, fallback: "gif", reason: "WebM export is not available in this build." },
};

function isOutputFormat(value: unknown): value is OutputFormat {
  return value === "gif" || value === "apng" || value === "mp4" || value === "webm";
}

function parseCustomPresets(raw: string | null): ExportPreset[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => ({
        id: String(entry.id ?? `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
        name: String(entry.name ?? "Preset"),
        width: Math.max(1, Number(entry.width) || 1),
        height: Math.max(1, Number(entry.height) || 1),
        format: isOutputFormat(entry.format) ? entry.format : "gif",
        createdAt: Number(entry.createdAt) || Date.now(),
      }));
  } catch {
    return [];
  }
}

function formatQueueItemLabel(item: Pick<ExportQueueItem, "width" | "height" | "requestedFormat">): string {
  return `${item.width}x${item.height} ${item.requestedFormat.toUpperCase()}`;
}

export function ExportButton() {
  const { state, processor, dispatch, processingAbortRef } = useEditor();
  const { trackExportFailure, trackExportPerf } = useTelemetry();
  const [exporting, setExporting] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<ExportDiagnostics | null>(null);
  const phaseMarkersRef = useRef<PhaseMarkers | null>(null);
  const [presetName, setPresetName] = useState("");
  const [customPresets, setCustomPresets] = useState<ExportPreset[]>([]);
  const [selectedCustomPresetId, setSelectedCustomPresetId] = useState<string>("");
  const [queue, setQueue] = useState<ExportQueueItem[]>([]);

  const canExport =
    !!state.file &&
    !!state.metadata &&
    !!processor &&
    state.status !== "loading" &&
    state.status !== "processing";

  const queueRunning = queue.some((item) => item.status === "exporting");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCustomPresets(parseCustomPresets(window.localStorage.getItem(CUSTOM_PRESETS_KEY)));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(customPresets));
  }, [customPresets]);

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
    const overlayScale =
      1 + Math.min(0.35, state.overlays.filter((o) => o.visible !== false).length * 0.03);

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
              ? `${safeMeta.width}x${safeMeta.height}, ${safeMeta.frameCount} frames, ${formatBytes(
                  safeMeta.fileSize
                )}`
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

  const resolveRequestedFormat = useCallback((requestedFormat: OutputFormat) => {
    const support = FORMAT_SUPPORT[requestedFormat];
    const outputFormat = support.native ? requestedFormat : support.fallback;
    return {
      requestedFormat,
      outputFormat,
      usedFallback: !support.native,
      reason: support.reason,
    };
  }, []);

  const runExport = useCallback(
    async (overrides?: Partial<OutputSettings>): Promise<ExportResultInfo> => {
      if (!state.file || !processor || !state.metadata) {
        return { success: false, message: "Missing file or processor", usedFallback: false };
      }
      const requestedSettings = { ...state.outputSettings, ...overrides };
      const formatResolution = resolveRequestedFormat(requestedSettings.format);
      const outputSettings = {
        ...requestedSettings,
        format: formatResolution.outputFormat,
      };

      phaseMarkersRef.current = {
        startedAt: performance.now(),
        decodingAt: null,
        compositingAt: null,
        encodingAt: null,
      };
      setExporting(true);
      const controller = new AbortController();
      processingAbortRef.current = controller;
      dispatch({ type: "PROCESSING_START" });
      try {
        processor.onProgress((p) => {
          const markers = phaseMarkersRef.current;
          const now = performance.now();
          if (markers) {
            if (p.phase === "Decoding" && markers.decodingAt === null) markers.decodingAt = now;
            if (p.phase === "Compositing" && markers.compositingAt === null) markers.compositingAt = now;
            if (p.phase === "Encoding" && markers.encodingAt === null) markers.encodingAt = now;
          }
          dispatch({ type: "PROCESSING_PROGRESS", payload: p });
        });
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
        const baseProject = (
          state.projectName ||
          state.file.name.replace(/\.[^.]+$/, "") ||
          "gifalchemy"
        )
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9-_]/g, "")
          .toLowerCase();
        const width = result.width || outputSettings.width || state.metadata.width;
        const height = result.height || outputSettings.height || state.metadata.height;
        const name = `${baseProject}-${width}x${height}.${result.format}`;
        triggerDownload(result.blob, name);
        const finishedAt = performance.now();
        const markers = phaseMarkersRef.current;
        if (markers && typeof window !== "undefined") {
          const decodeStart = markers.decodingAt ?? markers.startedAt;
          const encodeStart = markers.encodingAt ?? finishedAt;
          const compositeStart = markers.compositingAt;
          const decodeEnd = compositeStart ?? encodeStart;
          const decodeMs = Math.max(0, decodeEnd - decodeStart);
          const compositeMs = compositeStart ? Math.max(0, encodeStart - compositeStart) : 0;
          const encodeMs = markers.encodingAt ? Math.max(0, finishedAt - markers.encodingAt) : 0;
          const totalMs = Math.max(0, finishedAt - markers.startedAt);
          const profile = {
            decodeMs,
            compositeMs,
            encodeMs,
            totalMs,
            overlaysCount: visibleOverlays.length,
            frameCount: state.frames.length,
            format: result.format,
            at: Date.now(),
          };
          window.dispatchEvent(new CustomEvent("gifalchemy:export-profile", { detail: profile }));
          trackExportPerf(profile);
        }

        if (formatResolution.usedFallback) {
          const message = `${formatResolution.requestedFormat.toUpperCase()} requested, exported GIF instead. ${formatResolution.reason}`;
          toast.warning("Fallback export applied", { description: message });
          return { success: true, message, usedFallback: true };
        }

        toast.success(EDITOR_LABELS.export.doneToast);
        return { success: true, message: EDITOR_LABELS.export.doneToast, usedFallback: false };
      } catch (e) {
        const isAbort = e instanceof DOMException && e.name === "AbortError";
        if (isAbort) {
          dispatch({ type: "PROCESSING_DONE" });
          toast.info(EDITOR_LABELS.export.cancelledToast);
          return { success: false, message: EDITOR_LABELS.export.cancelledToast, usedFallback: false };
        }
        const fallback = ERROR_MESSAGES.PROCESSING_FAILED;
        const message = e instanceof Error ? e.message : fallback;
        dispatch({
          type: "PROCESSING_ERROR",
          payload: message,
        });
        trackExportFailure({
          message,
          overlaysCount: state.overlays.filter((o) => o.visible !== false).length,
          frameCount: state.frames.length,
          format: outputSettings.format,
        });
        setDiagnostics(buildDiagnostics(message));
        setDiagnosticsOpen(true);
        toast.error(EDITOR_LABELS.export.failedToastTitle, {
          description: `${message} ${EDITOR_LABELS.export.failedToastDescription}`,
        });
        return { success: false, message, usedFallback: false };
      } finally {
        processingAbortRef.current = null;
        setExporting(false);
      }
    },
    [
      buildDiagnostics,
      dispatch,
      processingAbortRef,
      processor,
      resolveRequestedFormat,
      state.file,
      state.frames.length,
      state.metadata,
      state.outputSettings,
      state.overlays,
      state.projectName,
      state.trimEnd,
      state.trimStart,
      trackExportFailure,
      trackExportPerf,
    ]
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
  }, [
    dispatch,
    runExport,
    state.metadata,
    state.outputSettings.height,
    state.outputSettings.quality,
    state.outputSettings.width,
  ]);

  const applyCustomPreset = useCallback(
    (presetId: string) => {
      const preset = customPresets.find((item) => item.id === presetId);
      if (!preset) return;
      dispatch({
        type: "UPDATE_OUTPUT_SETTINGS",
        payload: {
          width: preset.width,
          height: preset.height,
          format: preset.format,
        },
      });
      setSelectedCustomPresetId(presetId);
      toast.success(`Applied preset: ${preset.name}`);
    },
    [customPresets, dispatch]
  );

  const saveCurrentAsPreset = useCallback(() => {
    const width = state.outputSettings.width || state.metadata?.width;
    const height = state.outputSettings.height || state.metadata?.height;
    if (!width || !height) {
      toast.error("Set output dimensions before saving a preset");
      return;
    }
    const nextPreset: ExportPreset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: presetName.trim() || `${width}x${height} ${state.outputSettings.format.toUpperCase()}`,
      width,
      height,
      format: state.outputSettings.format,
      createdAt: Date.now(),
    };
    setCustomPresets((current) => [nextPreset, ...current].slice(0, 20));
    setPresetName("");
    setSelectedCustomPresetId(nextPreset.id);
    toast.success("Preset saved");
  }, [
    presetName,
    state.metadata?.height,
    state.metadata?.width,
    state.outputSettings.format,
    state.outputSettings.height,
    state.outputSettings.width,
  ]);

  const deleteSelectedCustomPreset = useCallback(() => {
    if (!selectedCustomPresetId) return;
    setCustomPresets((current) => current.filter((preset) => preset.id !== selectedCustomPresetId));
    setSelectedCustomPresetId("");
    toast.info("Preset removed");
  }, [selectedCustomPresetId]);

  const addQueueItem = useCallback((requestedFormat: OutputFormat, width: number, height: number) => {
    const item: ExportQueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      width,
      height,
      requestedFormat,
      status: "queued",
    };
    setQueue((current) => [...current, item]);
  }, []);

  const addCurrentToQueue = useCallback(() => {
    const width = state.outputSettings.width || state.metadata?.width;
    const height = state.outputSettings.height || state.metadata?.height;
    if (!width || !height) {
      toast.error("Set output dimensions before queueing");
      return;
    }
    addQueueItem(state.outputSettings.format, width, height);
    toast.success("Added current export to queue");
  }, [addQueueItem, state.metadata?.height, state.metadata?.width, state.outputSettings.format, state.outputSettings.height, state.outputSettings.width]);

  const addAllFormatsToQueue = useCallback(() => {
    const width = state.outputSettings.width || state.metadata?.width;
    const height = state.outputSettings.height || state.metadata?.height;
    if (!width || !height) {
      toast.error("Set output dimensions before queueing");
      return;
    }
    FORMAT_OPTIONS.forEach((option) => addQueueItem(option.value, width, height));
    toast.success("Queued GIF, APNG, MP4, and WebM variants");
  }, [addQueueItem, state.metadata?.height, state.metadata?.width, state.outputSettings.height, state.outputSettings.width]);

  const runQueue = useCallback(async () => {
    if (queueRunning) return;
    const pending = queue.filter((item) => item.status === "queued");
    if (pending.length === 0) {
      toast.info("No queued exports");
      return;
    }

    for (const item of pending) {
      setQueue((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status: "exporting", note: "Exporting..." } : entry
        )
      );

      const result = await runExport({
        width: item.width,
        height: item.height,
        format: item.requestedFormat,
      });

      setQueue((current) =>
        current.map((entry) => {
          if (entry.id !== item.id) return entry;
          return {
            ...entry,
            status: result.success ? "done" : "error",
            note: result.message,
          };
        })
      );
    }
  }, [queue, queueRunning, runExport]);

  const clearFinishedQueue = useCallback(() => {
    setQueue((current) => current.filter((item) => item.status === "queued" || item.status === "exporting"));
  }, []);

  const activeFormatSupportNote = useMemo(() => {
    const support = FORMAT_SUPPORT[state.outputSettings.format];
    if (support.native) return null;
    return `${state.outputSettings.format.toUpperCase()} falls back to ${support.fallback.toUpperCase()} for export.`;
  }, [state.outputSettings.format]);

  useEffect(() => {
    const onExportRequest = () => {
      if (!canExport || exporting || queueRunning) return;
      void handleExport();
    };
    window.addEventListener("gifalchemy:export-request", onExportRequest);
    return () => window.removeEventListener("gifalchemy:export-request", onExportRequest);
  }, [canExport, exporting, handleExport, queueRunning]);

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <Select onValueChange={applyExportPreset} disabled={!state.metadata || exporting || queueRunning}>
              <SelectTrigger
                className="h-8 w-[112px] rounded-lg text-xs"
                aria-label={EDITOR_LABELS.export.presetPlaceholder}
              >
                <SelectValue placeholder={EDITOR_LABELS.export.presetPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {RESIZE_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={state.outputSettings.format}
              disabled={!canExport || exporting || queueRunning}
              onValueChange={(value) =>
                dispatch({ type: "UPDATE_OUTPUT_SETTINGS", payload: { format: value as OutputFormat } })
              }
            >
              <SelectTrigger className="h-8 w-[84px] rounded-lg text-xs" aria-label="Output format">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {diagnostics ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setDiagnosticsOpen(true)}
                aria-label={EDITOR_LABELS.export.diagnosticsAriaOpen}
                title={EDITOR_LABELS.export.diagnosticsTitle}
              >
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </Button>
            ) : null}

            <Button
              variant="default"
              size="sm"
              className="rounded-lg gap-2 focus-visible:ring-2 focus-visible:ring-ring"
              disabled={!canExport || exporting || queueRunning}
              onClick={handleExport}
              aria-label={EDITOR_LABELS.export.primaryIdle}
            >
              <Download className="h-4 w-4" />
              {exporting ? EDITOR_LABELS.export.primaryBusy : EDITOR_LABELS.export.primaryIdle}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name"
              className="h-7 w-[110px] rounded-lg text-xs"
              disabled={exporting || queueRunning}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 rounded-lg px-2 text-xs"
              onClick={saveCurrentAsPreset}
              disabled={!canExport || exporting || queueRunning}
            >
              <Save className="h-3 w-3" />
              Save
            </Button>
            <Select
              value={selectedCustomPresetId}
              onValueChange={applyCustomPreset}
              disabled={customPresets.length === 0 || exporting || queueRunning}
            >
              <SelectTrigger className="h-7 w-[118px] rounded-lg text-xs" aria-label="Custom presets">
                <SelectValue placeholder="Custom presets" />
              </SelectTrigger>
              <SelectContent>
                {customPresets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={deleteSelectedCustomPreset}
              disabled={!selectedCustomPresetId || exporting || queueRunning}
              aria-label="Delete selected preset"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 rounded-lg px-2 text-xs"
              onClick={addCurrentToQueue}
              disabled={!canExport || exporting}
            >
              <ListPlus className="h-3 w-3" />
              Queue current
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-lg px-2 text-xs"
              onClick={addAllFormatsToQueue}
              disabled={!canExport || exporting}
            >
              Queue all formats
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 rounded-lg px-2 text-xs"
              onClick={() => void runQueue()}
              disabled={exporting || queueRunning || queue.every((item) => item.status !== "queued")}
            >
              <Play className="h-3 w-3" />
              {queueRunning ? "Running" : "Run queue"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-2 text-xs"
              onClick={clearFinishedQueue}
              disabled={queue.length === 0}
            >
              Clear done
            </Button>
          </div>

          {queue.length > 0 && (
            <div className="w-full max-w-[470px] rounded-lg border border-border/60 bg-muted/20 px-2 py-1">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Export queue</p>
              <div className="space-y-1">
                {queue.slice(-4).map((item) => (
                  <div key={item.id} className="text-[10px] leading-tight">
                    <span className="font-medium">{formatQueueItemLabel(item)}</span>
                    <span className="text-muted-foreground"> {item.status.toUpperCase()}</span>
                    {item.note ? <span className="text-muted-foreground"> - {item.note}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground" aria-live="polite">
            {EDITOR_LABELS.export.estimatePrefix}:{" "}
            {estimatedOutputSize
              ? formatBytes(estimatedOutputSize)
              : EDITOR_LABELS.export.estimateUnknown}
            {activeFormatSupportNote ? ` | ${activeFormatSupportNote}` : ""}
          </p>
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
