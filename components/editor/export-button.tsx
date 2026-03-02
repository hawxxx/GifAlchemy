"use client";

import { useState, useRef } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEditor } from "@/hooks/use-editor";
import {
  exportGif,
  exportGifWithOverlays,
  triggerDownload,
} from "@/core/application/commands/editor-commands";
import { ERROR_MESSAGES } from "@/lib/constants";

export function ExportButton() {
  const { state, processor, dispatch, processingAbortRef } = useEditor();
  const [exporting, setExporting] = useState(false);

  const canExport = state.file && state.metadata && processor && state.status === "ready";

  const handleExport = async () => {
    if (!state.file || !processor || !state.metadata) return;
    setExporting(true);
    const controller = new AbortController();
    processingAbortRef.current = controller;
    dispatch({ type: "PROCESSING_START" });
    try {
      processor.onProgress((p) =>
        dispatch({ type: "PROCESSING_PROGRESS", payload: p })
      );
      const result =
        state.overlays.length > 0
          ? await exportGifWithOverlays(
              processor,
              state.file,
              state.outputSettings,
              state.overlays,
              state.frames.length,
              controller.signal
            )
          : await exportGif(processor, state.file, state.outputSettings, controller.signal);
      dispatch({ type: "PROCESSING_DONE" });
      const name = state.file.name.replace(/\.[^.]+$/, "") + "-export." + result.format;
      triggerDownload(result.blob, name);
      toast.success("Export complete");
    } catch (e) {
      const isAbort = e instanceof DOMException && e.name === "AbortError";
      if (isAbort) {
        dispatch({ type: "PROCESSING_DONE" });
        toast.info("Export cancelled");
      } else {
        dispatch({
          type: "PROCESSING_ERROR",
          payload: e instanceof Error ? e.message : ERROR_MESSAGES.PROCESSING_FAILED,
        });
        toast.error(e instanceof Error ? e.message : ERROR_MESSAGES.PROCESSING_FAILED);
      }
    } finally {
      processingAbortRef.current = null;
      setExporting(false);
    }
  };

  return (
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
  );
}
