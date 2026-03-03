"use client";

import { useState } from "react";
import { ChevronUp, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface NextStepOption {
  letter: string;
  goal: string;
  scope: "S" | "M" | "L";
  files: string;
}

const DEFAULT_OPTIONS: NextStepOption[] = [
  { letter: "A", goal: "Playback speed control (0.5×, 1×, 2×)", scope: "S", files: "use-playback.ts, timeline-panel.tsx" },
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
      toast.success(`"${letter}" copied — paste in chat to implement: ${goal}`);
    } else {
      toast.success(`Option ${letter}: ${goal}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1">
      {open && (
        <div
          className={cn(
            "rounded-xl border border-border/50 bg-background/95 backdrop-blur shadow-lg p-2 min-w-[200px]",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
          )}
        >
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1 mb-1">
            Next steps — click to copy & paste in chat
          </p>
          <div className="flex flex-wrap gap-1">
            {options.map((opt) => (
              <button
                key={opt.letter}
                type="button"
                onClick={() => copyAndToast(opt.letter, opt.goal)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium",
                  "bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                )}
                title={`${opt.goal} (${opt.scope}) — ${opt.files}`}
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
        className="rounded-full h-9 w-9 p-0 shadow-md"
        onClick={() => setOpen((o) => !o)}
        title={open ? "Close next steps" : "Next steps menu"}
      >
        <ListTodo className="h-4 w-4" />
      </Button>
    </div>
  );
}
