"use client";

import { useState, useCallback, useEffect } from "react";
import { Download } from "lucide-react";
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

export function ExportButton() {
  const { state, processor, dispatch, processingAbortRef } = useEditor();
  const [exporting, setExporting] = useState(false);

  const canExport = state.file && state.metadata && processor && state.status === "ready";

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

  const handleExport = useCallback(async () => {
    if (!state.file || !processor || !state.metadata) return;
    setExporting(true);
    const controller = new AbortController();
    processingAbortRef.current = controller;
    dispatch({ type: "PROCESSING_START" });
    try {
      processor.onProgress((p) =>
        dispatch({ type: "PROCESSING_PROGRESS", payload: p })
      );
      const visibleOverlays = state.overlays.filter((o) => o.visible !== false);
      const result =
        visibleOverlays.length > 0
          ? await exportGifWithOverlays(
              processor,
              state.file,
              state.outputSettings,
              visibleOverlays,
              state.frames.length,
              state.trimStart,
              state.trimEnd,
              controller.signal
            )
          : await exportGif(
              processor,
              state.file,
              state.outputSettings,
              state.frames.length,
              state.trimStart,
              state.trimEnd,
              controller.signal
            );
      dispatch({ type: "PROCESSING_DONE" });
      const baseProject = (state.projectName || state.file.name.replace(/\.[^.]+$/, "") || "gifalchemy")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-_]/g, "")
        .toLowerCase();
      const width = result.width || state.outputSettings.width || state.metadata.width;
      const height = result.height || state.outputSettings.height || state.metadata.height;
      const name = `${baseProject}-${width}x${height}.${result.format}`;
      triggerDownload(result.blob, name);
      toast.success("Export complete");
    } catch (e) {
      const isAbort = e instanceof DOMException && e.name === "AbortError";
      if (isAbort) {
        dispatch({ type: "PROCESSING_DONE" });
        toast.info("Export cancelled");
      } else {
        const fallback = ERROR_MESSAGES.PROCESSING_FAILED;
        const message = e instanceof Error ? e.message : fallback;
        dispatch({
          type: "PROCESSING_ERROR",
          payload: message,
        });
        toast.error("Export failed", {
          description: `${message} Try trimming fewer frames, lowering output size, or retrying export.`,
        });
      }
    } finally {
      processingAbortRef.current = null;
      setExporting(false);
    }
  }, [dispatch, processingAbortRef, processor, state.file, state.frames.length, state.metadata, state.outputSettings, state.overlays, state.projectName, state.trimEnd, state.trimStart]);

  useEffect(() => {
    const onExportRequest = () => {
      if (!canExport || exporting) return;
      void handleExport();
    };
    window.addEventListener("gifalchemy:export-request", onExportRequest);
    return () => window.removeEventListener("gifalchemy:export-request", onExportRequest);
  }, [canExport, exporting, handleExport]);

  return (
    <div className="flex items-center gap-2">
      <Select
        onValueChange={applyExportPreset}
        disabled={!state.metadata || exporting}
      >
        <SelectTrigger className="h-8 w-[112px] rounded-lg text-xs">
          <SelectValue placeholder="Size preset" />
        </SelectTrigger>
        <SelectContent>
          {RESIZE_PRESETS.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="default"
        size="sm"
        className="rounded-lg gap-2"
        disabled={!canExport || exporting}
        onClick={handleExport}
      >
        <Download className="h-4 w-4" />
        {exporting ? "Exporting…" : "Export"}
      </Button>
    </div>
  );
}
