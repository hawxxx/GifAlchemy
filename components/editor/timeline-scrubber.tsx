"use client";

import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/lib/utils";

export function TimelineScrubber() {
  const { state, dispatch } = useEditor();
  const { frames, currentFrameIndex, overlays, activeTool } = state;
  const frameCount = frames.length;
  const isPlaying = false;
  const keyframeFrames = overlays.flatMap((o) => o.keyframes.map((k) => k.frameIndex));

  if (frameCount === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
        No frames
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-lg h-8 w-8"
        disabled
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="relative flex-1 flex items-center gap-2">
        <Slider
          className="flex-1"
          value={[currentFrameIndex]}
          min={0}
          max={Math.max(0, frameCount - 1)}
          step={1}
          onValueChange={([v]) => dispatch({ type: "SET_FRAME", payload: v ?? 0 })}
        />
        {activeTool === "text" && keyframeFrames.length > 0 && (
          <div className="absolute top-1/2 -translate-y-1/2 left-2 right-10 flex pointer-events-none">
            {keyframeFrames
              .filter((_, i, a) => a.indexOf(keyframeFrames[i]) === i)
              .map((kf) => (
                <div
                  key={kf}
                  className="absolute w-2 h-2 rounded-full bg-primary border border-background"
                  style={{
                    left: `${(kf / (frameCount - 1 || 1)) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ))}
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground tabular-nums min-w-[4ch]">
        {currentFrameIndex + 1} / {frameCount}
      </span>
    </div>
  );
}
