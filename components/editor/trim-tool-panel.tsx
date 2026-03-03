"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/lib/utils";

export function TrimToolPanel() {
  const { state, dispatch } = useEditor();
  const frameCount = state.frames.length;
  const trimStart = state.trimStart;
  const trimEnd = state.trimEnd;
  const trimmedCount = frameCount > 0 ? Math.max(0, trimEnd - trimStart + 1) : 0;

  if (frameCount === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Load a GIF to set trim range.
      </p>
    );
  }

  const lastFrame = frameCount - 1;
  const setTrim = (start: number, end: number) => {
    const s = Math.max(0, Math.min(lastFrame, start));
    const e = Math.max(s, Math.min(lastFrame, end));
    dispatch({ type: "SET_TRIM", payload: { trimStart: s, trimEnd: e } });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Export only frames in this range. Playback still shows the full timeline.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Start frame</Label>
          <Input
            type="number"
            min={0}
            max={lastFrame}
            value={trimStart}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) setTrim(v, trimEnd);
            }}
            className="rounded-lg mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">End frame</Label>
          <Input
            type="number"
            min={trimStart}
            max={lastFrame}
            value={trimEnd}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) setTrim(trimStart, v);
            }}
            className="rounded-lg mt-1"
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">Range</Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            Frames {trimStart}–{trimEnd} ({trimmedCount} of {frameCount})
          </span>
        </div>
        <div className="space-y-2">
          <div>
            <span className="text-[10px] text-muted-foreground">Start</span>
            <Slider
              value={[trimStart]}
              min={0}
              max={lastFrame}
              step={1}
              onValueChange={([v]) => setTrim(v ?? 0, trimEnd)}
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">End</span>
            <Slider
              value={[trimEnd]}
              min={trimStart}
              max={lastFrame}
              step={1}
              onValueChange={([v]) => setTrim(trimStart, v ?? lastFrame)}
            />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => dispatch({ type: "SET_TRIM", payload: { trimStart: 0, trimEnd: lastFrame } })}
        className={cn(
          "text-xs text-muted-foreground hover:text-foreground underline",
          trimStart === 0 && trimEnd === lastFrame && "opacity-60 cursor-default no-underline"
        )}
      >
        Reset to full timeline
      </button>
    </div>
  );
}
