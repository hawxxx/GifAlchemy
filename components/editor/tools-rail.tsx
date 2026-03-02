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
import { TOOL_IDS, TOOLS_ACTIVE, TOOLS_COMING_SOON } from "@/lib/constants";

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
          "flex flex-col items-center py-2 gap-1 border-r border-border/50 bg-muted/30 rounded-r-xl",
          className
        )}
      >
        {TOOL_IDS.map((id) => {
          const isActive = activeTool === id;
          const isComingSoon = TOOLS_COMING_SOON.includes(id);
          const Icon = TOOL_ICONS[id];
          const button = (
            <button
              type="button"
              onClick={() => !isComingSoon && onSelectTool(isActive ? null : id)}
              disabled={isComingSoon}
              aria-label={isComingSoon ? `${id} (coming soon)` : id}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-120 ease-out",
                isComingSoon && "cursor-not-allowed opacity-60",
                isActive && "bg-accent text-accent-foreground",
                !isActive && !isComingSoon && "hover:bg-accent/70"
              )}
            >
              {Icon && <Icon className="h-5 w-5" />}
            </button>
          );
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="right" className="rounded-lg">
                {isComingSoon ? "Coming soon" : id.charAt(0).toUpperCase() + id.slice(1)}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </aside>
    </TooltipProvider>
  );
}
