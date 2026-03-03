"use client";

import { useState } from "react";
import { ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EDITOR_LABELS } from "@/lib/i18n/editor-labels";

export interface NextStepOption {
  letter: string;
  goal: string;
  scope: "S" | "M" | "L";
  files: string;
}

const DEFAULT_OPTIONS: NextStepOption[] = [
  { letter: "A", goal: "Playback speed control (0.5x, 1x, 2x)", scope: "S", files: "use-playback.ts, timeline-panel.tsx" },
  { letter: "B", goal: "Persist playback speed in project/URL", scope: "S", files: "project.ts, editor-provider.tsx" },
  { letter: "C", goal: "Frame thumbnails on timeline", scope: "M", files: "timeline-panel.tsx, use-frame-thumbnails.ts" },
  { letter: "D", goal: "Undo/redo for overlays and settings", scope: "M", files: "editor-provider.tsx, editor-top-bar.tsx" },
  { letter: "E", goal: "Export GIF with text overlays baked in", scope: "L", files: "wasm-gif-processor.adapter.ts, editor-commands.ts" },
  { letter: "F", goal: "Zoom/pan for canvas", scope: "M", files: "canvas-stage.tsx" },
];

export function NextStepsMenu({ options = DEFAULT_OPTIONS }: { options?: NextStepOption[] }) {
  const [open, setOpen] = useState(false);

  const copyAndToast = (letter: string, goal: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(letter);
      toast.success(`"${letter}" ${EDITOR_LABELS.nextSteps.copied}: ${goal}`);
    } else {
      toast.success(`${EDITOR_LABELS.nextSteps.optionFallback} ${letter}: ${goal}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1">
      {open && (
        <div
          className={cn(
            "rounded-xl border border-border bg-background/95 backdrop-blur shadow-lg p-2 min-w-[220px]",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
          )}
        >
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1 mb-1">
            {EDITOR_LABELS.nextSteps.heading}
          </p>
          <div className="flex flex-wrap gap-1">
            {options.map((opt) => (
              <button
                key={opt.letter}
                type="button"
                onClick={() => copyAndToast(opt.letter, opt.goal)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium",
                  "bg-primary text-primary-foreground hover:opacity-90 transition-opacity",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                title={`${opt.goal} (${opt.scope}) - ${opt.files}`}
                aria-label={`${opt.letter}. ${opt.goal}`}
              >
                <span className="w-5 h-5 rounded bg-white/20 flex items-center justify-center font-bold">
                  {opt.letter}
                </span>
                <span className="truncate max-w-[140px]">{opt.goal}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="rounded-full h-9 w-9 p-0 shadow-md focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((o) => !o)}
        title={open ? EDITOR_LABELS.nextSteps.close : EDITOR_LABELS.nextSteps.open}
        aria-label={open ? EDITOR_LABELS.nextSteps.close : EDITOR_LABELS.nextSteps.open}
      >
        <ListTodo className="h-4 w-4" />
      </Button>
    </div>
  );
}
