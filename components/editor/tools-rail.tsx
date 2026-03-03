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
          "flex flex-col py-3 border-r border-border/40 bg-card rounded-r-xl",
          className
        )}
      >
        {TOOL_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && (
              <div className="my-2 mx-3 border-t border-border/30" />
            )}
            {group.map((id) => {
              const isActive = activeTool === id;
              const Icon = TOOL_ICONS[id];
              return (
                <div
                  key={id}
                  className="relative flex items-center justify-center py-0.5"
                >
                  {isActive && (
                    <span className="absolute left-0 h-5 w-[2px] rounded-r-full bg-primary" />
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onSelectTool(isActive ? null : id)}
                        aria-label={TOOL_LABELS[id]}
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 ease-out",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                          "active:scale-[0.97]",
                          isActive
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {Icon && <Icon className="h-[18px] w-[18px]" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="rounded-lg">
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
