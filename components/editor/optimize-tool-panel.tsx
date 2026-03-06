"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/lib/utils";
import type { OutputFormat } from "@/core/domain/gif-types";

const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;
const EXPORT_SUPPORT_MATRIX: Array<{
  format: OutputFormat;
  status: "native" | "fallback";
  fallbackTo?: OutputFormat;
  note: string;
}> = [
  { format: "gif", status: "native", note: "Fully supported encoder." },
  {
    format: "apng",
    status: "fallback",
    fallbackTo: "gif",
    note: "APNG path is unavailable in this build.",
  },
  {
    format: "mp4",
    status: "fallback",
    fallbackTo: "gif",
    note: "Video container export is unavailable in this build.",
  },
  {
    format: "webm",
    status: "fallback",
    fallbackTo: "gif",
    note: "Video container export is unavailable in this build.",
  },
];

export function OptimizeToolPanel() {
  const { state, dispatch } = useEditor();
  const selectedFormat = state.outputSettings.format;
  const backgroundMode = state.outputSettings.backgroundMode ?? "transparent";
  const backgroundColor = state.outputSettings.backgroundColor ?? "#10141A";

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs mb-2 block">Playback speed</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {SPEED_OPTIONS.map((speed) => (
            <Button
              key={speed}
              type="button"
              variant={state.playbackRate === speed ? "default" : "outline"}
              size="sm"
              className={cn("rounded-lg text-xs", state.playbackRate === speed && "shadow-sm")}
              onClick={() => dispatch({ type: "SET_PLAYBACK_RATE", payload: speed })}
            >
              {speed}x
            </Button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">Output quality</Label>
          <span className="text-xs text-muted-foreground tabular-nums">{state.outputSettings.quality}%</span>
        </div>
        <Slider
          value={[state.outputSettings.quality]}
          min={40}
          max={100}
          step={1}
          onValueChange={([v]) =>
            dispatch({
              type: "UPDATE_OUTPUT_SETTINGS",
              payload: { quality: Math.max(40, Math.min(100, v ?? 80)) },
            })
          }
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Higher quality can increase output size and export time.
        </p>
      </div>

      <div className="space-y-2.5 rounded-lg border border-border/60 bg-background/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-xs">Background</Label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Keep transparency for transparent GIFs, or bake in a solid color.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={backgroundMode === "transparent" ? "default" : "outline"}
            size="sm"
            className="rounded-lg text-xs"
            onClick={() =>
              dispatch({
                type: "UPDATE_OUTPUT_SETTINGS",
                payload: { backgroundMode: "transparent" },
              })
            }
          >
            Transparent
          </Button>
          <Button
            type="button"
            variant={backgroundMode === "solid" ? "default" : "outline"}
            size="sm"
            className="rounded-lg text-xs"
            onClick={() =>
              dispatch({
                type: "UPDATE_OUTPUT_SETTINGS",
                payload: { backgroundMode: "solid" },
              })
            }
          >
            Solid color
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={backgroundColor}
            disabled={backgroundMode !== "solid"}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_OUTPUT_SETTINGS",
                payload: { backgroundColor: e.target.value, backgroundMode: "solid" },
              })
            }
            className="h-9 w-11 cursor-pointer rounded-lg border border-border/70 bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Background color"
          />
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
            {backgroundMode === "solid"
              ? `Export will render over ${backgroundColor.toUpperCase()}.`
              : "Transparent pixels stay transparent in preview/export where supported."}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5">
        <p className="text-[11px] text-muted-foreground">
          Tip: For faster exports, trim timeline range and reduce output dimensions in Resize.
        </p>
      </div>

      <div className="rounded-lg border border-border/60 bg-background/70 p-2.5">
        <p className="text-xs font-medium mb-2">Export format support matrix</p>
        <div className="space-y-1.5">
          {EXPORT_SUPPORT_MATRIX.map((row) => {
            const isActive = row.format === selectedFormat;
            return (
              <div
                key={row.format}
                className={cn(
                  "rounded border px-2 py-1.5 text-[11px]",
                  isActive ? "border-primary/50 bg-primary/5" : "border-border/50 bg-muted/20"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium uppercase">{row.format}</span>
                  <span
                    className={cn(
                      "uppercase text-[10px]",
                      row.status === "native" ? "text-emerald-600" : "text-amber-600"
                    )}
                  >
                    {row.status === "native" ? "native" : `fallback -> ${row.fallbackTo?.toUpperCase()}`}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{row.note}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
