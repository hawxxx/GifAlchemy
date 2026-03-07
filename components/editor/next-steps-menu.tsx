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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div
          className={cn(
            "rounded-[16px] border border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] p-3 min-w-[240px]",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200 origin-bottom-right"
          )}
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 px-1 py-1 mb-2 font-medium">
            {EDITOR_LABELS.nextSteps.heading}
          </p>
          <div className="flex flex-col gap-1.5">
            {options.map((opt) => (
              <button
                key={opt.letter}
                type="button"
                onClick={() => copyAndToast(opt.letter, opt.goal)}
                className={cn(
                  "inline-flex items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-xs font-medium text-white/90",
                  "bg-white/[0.04] border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-150 active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 group"
                )}
                title={`${opt.goal} (${opt.scope}) - ${opt.files}`}
                aria-label={`${opt.letter}. ${opt.goal}`}
              >
                <span className="w-5 h-5 rounded-[6px] bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                  {opt.letter}
                </span>
                <span className="truncate max-w-[170px]">{opt.goal}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full h-10 w-10 shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] focus-visible:ring-1 focus-visible:ring-primary/40 bg-[#1a1f2e] hover:bg-[#252b3d] border border-white/10 text-white/80 transition-all duration-200"
        onClick={() => setOpen((o) => !o)}
        title={open ? EDITOR_LABELS.nextSteps.close : EDITOR_LABELS.nextSteps.open}
        aria-label={open ? EDITOR_LABELS.nextSteps.close : EDITOR_LABELS.nextSteps.open}
      >
        <ListTodo className="h-4 w-4" />
      </Button>
    </div>
  );
}
