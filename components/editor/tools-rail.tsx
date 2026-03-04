"use client";

import {
  Crop,
  Maximize2,
  Zap,
  Type,
  Sticker,
  LayoutTemplate,
  Layers,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ToolId } from "@/lib/constants";

const TOOL_ICONS: Record<ToolId, React.ComponentType<{ className?: string }>> = {
  resize: Maximize2,
  trim: Crop,
  optimize: Zap,
  text: Type,
  stickers: Sticker,
  templates: LayoutTemplate,
  batch: Layers,
};

const TOOL_LABELS: Record<ToolId, string> = {
  resize: "Resize",
  trim: "Trim",
  optimize: "Optimize",
  text: "Text",
  stickers: "Stickers",
  templates: "Templates",
  batch: "Batch",
};

const TOOL_GROUPS: ToolId[][] = [
  ["resize", "trim", "optimize"],
  ["text", "stickers", "templates"],
  ["batch"],
];

export interface ToolsRailProps {
  activeTool: ToolId | null;
  onSelectTool: (tool: ToolId | null) => void;
  className?: string;
}

export function ToolsRail({ activeTool, onSelectTool, className }: ToolsRailProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          "flex w-full items-center gap-1.5 overflow-x-auto rounded-2xl border border-border/60 bg-card/90 px-2 py-2",
          "shadow-[0_14px_26px_-22px_hsl(var(--foreground)/0.6)] ring-1 ring-black/[0.03] backdrop-blur supports-[backdrop-filter]:bg-card/80",
          "md:w-auto md:flex-col md:overflow-visible md:px-2 md:py-4 dark:ring-white/[0.04]",
          className
        )}
      >
        {TOOL_GROUPS.map((group, gi) => (
          <div key={gi} className="flex items-center px-0.5 md:flex-col md:px-1.5">
            {gi > 0 && (
              <div className="mx-1.5 h-7 border-l border-border/50 md:mx-1 md:my-2.5 md:h-auto md:w-full md:border-l-0 md:border-t" />
            )}
            {group.map((id) => {
              const isActive = activeTool === id;
              const Icon = TOOL_ICONS[id];
              return (
                <div
                  key={id}
                  className="relative flex items-center justify-center px-0.5 md:py-1 md:px-0"
                >
                  {isActive && (
                    <>
                      <span className="absolute -top-1.5 h-0.5 w-5 rounded-b-full bg-primary md:hidden" />
                      <span className="absolute -left-[7px] hidden h-5 w-0.5 rounded-r-full bg-primary md:block" />
                    </>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onSelectTool(isActive ? null : id)}
                        aria-label={TOOL_LABELS[id]}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-150 ease-out md:h-10 md:w-10",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          "active:scale-[0.97]",
                          isActive
                            ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]"
                            : "text-muted-foreground hover:bg-accent/85 hover:text-accent-foreground"
                        )}
                      >
                        {Icon && <Icon className="h-[17px] w-[17px]" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="rounded-md border-border/60">
                      {TOOL_LABELS[id]}
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        ))}
      </aside>
    </TooltipProvider>
  );
}
