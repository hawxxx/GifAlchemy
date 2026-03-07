"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
      <div className="space-y-3 rounded-xl border border-white/5 bg-black/10 p-3">
        <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-2">Playback speed</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={cn(
                "h-8 rounded-lg border transition-colors text-[11px] font-medium",
                state.playbackRate === speed
                  ? "border-primary/40 bg-primary/15 text-primary shadow-sm"
                  : "border-white/10 bg-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
              onClick={() => dispatch({ type: "SET_PLAYBACK_RATE", payload: speed })}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-white/5 bg-black/10 p-3">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Output quality</Label>
          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{state.outputSettings.quality}%</span>
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
        <p className="text-[10px] text-muted-foreground/80 leading-relaxed pt-1">
          Higher quality can increase output size and export time.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-white/5 bg-black/10 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Background</Label>
            <p className="mt-1 text-[10px] text-muted-foreground/80">
              Keep transparency for transparent GIFs, or bake in a solid color.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn(
              "h-8 flex-1 rounded-lg border transition-colors text-[11px] font-medium",
              backgroundMode === "transparent"
                ? "border-primary/40 bg-primary/15 text-primary shadow-sm"
                : "border-white/10 bg-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
            onClick={() =>
              dispatch({
                type: "UPDATE_OUTPUT_SETTINGS",
                payload: { backgroundMode: "transparent" },
              })
            }
          >
            Transparent
          </button>
          <button
            type="button"
            className={cn(
              "h-8 flex-1 rounded-lg border transition-colors text-[11px] font-medium",
              backgroundMode === "solid"
                ? "border-primary/40 bg-primary/15 text-primary shadow-sm"
                : "border-white/10 bg-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
            onClick={() =>
              dispatch({
                type: "UPDATE_OUTPUT_SETTINGS",
                payload: { backgroundMode: "solid" },
              })
            }
          >
            Solid color
          </button>
        </div>
        <div className="flex items-center gap-3 pt-1">
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
            className="h-8 w-12 cursor-pointer rounded-lg border border-white/10 bg-black/20 p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Background color"
          />
          <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-[10px] text-muted-foreground flex-1">
            {backgroundMode === "solid"
              ? `Export will render over ${backgroundColor.toUpperCase()}`
              : "Transparent pixels stay transparent"}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-black/20 p-3">
        <p className="text-[10px] leading-relaxed text-muted-foreground/80">
          Tip: For faster exports, trim timeline range and reduce output dimensions in <span className="text-muted-foreground font-medium">Resize</span>.
        </p>
      </div>

      <div className="rounded-xl border border-white/5 bg-black/10 p-3">
        <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3 block">Format support</Label>
        <div className="space-y-2">
          {EXPORT_SUPPORT_MATRIX.map((row) => {
            const isActive = row.format === selectedFormat;
            return (
              <div
                key={row.format}
                className={cn(
                  "rounded-lg border p-2 text-[11px] transition-colors",
                  isActive ? "border-primary/30 bg-primary/10" : "border-white/5 bg-black/30"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium uppercase text-foreground">{row.format}</span>
                  <span
                    className={cn(
                      "uppercase text-[9px] px-1.5 py-0.5 rounded-full border",
                      row.status === "native" 
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                        : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    )}
                  >
                    {row.status === "native" ? "native" : `fallback -> ${row.fallbackTo?.toUpperCase()}`}
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground/80">{row.note}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
