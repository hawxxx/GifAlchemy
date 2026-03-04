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
          "flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-card/90 px-2 py-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur supports-[backdrop-filter]:bg-card/80 dark:ring-white/[0.04]",
          className
        )}
      >
        {TOOL_GROUPS.map((group, gi) => (
          <div key={gi} className="px-1.5">
            {gi > 0 && (
              <div className="mx-1 my-2.5 border-t border-border/50" />
            )}
            {group.map((id) => {
              const isActive = activeTool === id;
              const Icon = TOOL_ICONS[id];
              return (
                <div
                  key={id}
                  className="relative flex items-center justify-center py-1"
                >
                  {isActive && (
                    <span className="absolute -left-[7px] h-5 w-0.5 rounded-r-full bg-primary" />
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onSelectTool(isActive ? null : id)}
                        aria-label={TOOL_LABELS[id]}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ease-out",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          "active:scale-[0.97]",
                          isActive
                            ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.22)]"
                            : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground"
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
