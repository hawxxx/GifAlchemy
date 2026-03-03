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
import { TOOL_IDS } from "@/lib/constants";

const TOOL_ICONS: Record<ToolId, React.ComponentType<{ className?: string }>> = {
  resize: Maximize2,
  trim: Crop,
  optimize: Zap,
  text: Type,
  stickers: Sticker,
  templates: LayoutTemplate,
  batch: Layers,
};

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
          "flex flex-col items-center py-3 gap-2 border-r border-border/50 bg-muted/20 rounded-r-xl",
          className
        )}
      >
        {TOOL_IDS.map((id) => {
          const isActive = activeTool === id;
          const Icon = TOOL_ICONS[id];
          const button = (
            <button
              type="button"
              onClick={() => onSelectTool(isActive ? null : id)}
              aria-label={id}
              title={`${id.charAt(0).toUpperCase() + id.slice(1)} (click to ${isActive ? "deselect" : "select"})`}
              className={cn(
                "flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "active:scale-95",
                isActive && "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30",
                !isActive && "hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
              )}
            >
              {Icon && <Icon className="h-5 w-5" />}
            </button>
          );
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="right" className="rounded-lg">
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </aside>
    </TooltipProvider>
  );
}
