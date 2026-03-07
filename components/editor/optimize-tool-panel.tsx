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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1 mb-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Playback Speed</Label>
        </div>
        <div className="flex gap-1.5 bg-black/20 p-1 rounded-md border border-white/5">
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={cn(
                "flex-1 h-7 rounded transition-all text-[11px] font-bold tracking-wider",
                state.playbackRate === speed
                  ? "bg-white/10 text-white shadow-sm"
                  : "bg-transparent text-white/40 hover:bg-white/5 hover:text-white/80"
              )}
              onClick={() => dispatch({ type: "SET_PLAYBACK_RATE", payload: speed })}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1 mb-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Output Quality</Label>
          <span className="text-[10px] font-bold text-white/70 tabular-nums">{state.outputSettings.quality}%</span>
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
          className="[&_[data-slot=range]]:bg-primary [&_[data-slot=thumb]]:h-3 [&_[data-slot=thumb]]:w-3 [&_[data-slot=thumb]]:border-none [&_[data-slot=track]]:h-1 [&_[data-slot=track]]:bg-white/10"
        />
        <p className="text-[9px] font-medium text-white/30 leading-tight mt-1">
          Higher quality increases export time and file size.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded border border-white/5 bg-white/[0.02] p-3">
        <div className="flex flex-col gap-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Background</Label>
          <p className="text-[9px] font-medium text-white/30 leading-tight">
            Keep transparency or bake in a solid color.
          </p>
        </div>
        
        <div className="flex gap-1.5 bg-black/20 p-1 rounded-md border border-white/5">
          <button
            type="button"
            className={cn(
               "flex-1 h-7 rounded transition-all text-[11px] font-bold tracking-wider",
              backgroundMode === "transparent"
                ? "bg-white/10 text-white shadow-sm"
                : "bg-transparent text-white/40 hover:bg-white/5 hover:text-white/80"
            )}
            onClick={() =>
              dispatch({
                type: "UPDATE_OUTPUT_SETTINGS",
                payload: { backgroundMode: "transparent" },
              })
            }
          >
            Clear
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 h-7 rounded transition-all text-[11px] font-bold tracking-wider",
              backgroundMode === "solid"
                ? "bg-white/10 text-white shadow-sm"
                : "bg-transparent text-white/40 hover:bg-white/5 hover:text-white/80"
            )}
            onClick={() =>
              dispatch({
                type: "UPDATE_OUTPUT_SETTINGS",
                payload: { backgroundMode: "solid" },
              })
            }
          >
            Solid
          </button>
        </div>
        <div className={cn(
          "flex items-center gap-2 transition-all overflow-hidden",
          backgroundMode === "solid" ? "opacity-100 max-h-10 mt-1" : "opacity-40 max-h-10 mt-1 pointer-events-none"
        )}>
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
            className="h-6 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
            aria-label="Background color"
          />
          <div className="rounded border border-white/5 bg-black/20 px-2 py-1 flex-1 text-[9px] font-mono text-white/50 tracking-wider">
            {backgroundMode === "solid" ? backgroundColor.toUpperCase() : "TRANSPARENT"}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1 mb-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Format Support</Label>
        </div>
        <div className="flex flex-col gap-1.5">
          {EXPORT_SUPPORT_MATRIX.map((row) => {
            const isActive = row.format === selectedFormat;
            return (
              <div
                key={row.format}
                className={cn(
                  "flex items-center justify-between rounded px-2 py-1.5 border transition-all",
                  isActive ? "border-primary/30 bg-primary/10" : "border-white/5 bg-black/20"
                )}
              >
                <div className="flex flex-col gap-0.5">
                   <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">{row.format}</span>
                   <span className="text-[9px] font-medium text-white/40">{row.note}</span>
                </div>
                <div
                  className={cn(
                    "uppercase text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded border",
                    row.status === "native" 
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                      : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                  )}
                >
                  {row.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
