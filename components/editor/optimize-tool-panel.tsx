"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/lib/utils";

const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;

export function OptimizeToolPanel() {
  const { state, dispatch } = useEditor();

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

      <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5">
        <p className="text-[11px] text-muted-foreground">
          Tip: For faster exports, trim timeline range and reduce output dimensions in Resize.
        </p>
      </div>
    </div>
  );
}
