"use client";

import {
  Crop,
  Maximize2,
  Zap,
  Type,
  ImageIcon,
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
  image: ImageIcon,
  stickers: Sticker,
  templates: LayoutTemplate,
  batch: Layers,
};

const TOOL_LABELS: Record<ToolId, string> = {
  resize: "Resize",
  trim: "Trim",
  optimize: "Optimize",
  text: "Text",
  image: "Image",
  stickers: "Stickers",
  templates: "Templates",
  batch: "Batch",
};

const TOOL_GROUPS: ToolId[][] = [
  ["resize", "trim", "optimize"],
  ["text", "image", "stickers", "templates"],
  ["batch"],
];

export interface ToolsRailProps {
  activeTool: ToolId | null;
  imageAssetsOpen?: boolean;
  onSelectTool: (tool: ToolId | null) => void;
  className?: string;
}

export function ToolsRail({
  activeTool,
  imageAssetsOpen = false,
  onSelectTool,
  className,
}: ToolsRailProps) {
  return (
    <TooltipProvider delayDuration={400}>
      <aside
        className={cn(
          "animate-panel-in flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-white/10 px-2 py-2",
          "bg-black/40 backdrop-blur-xl shadow-2xl transition-all duration-300",
          "md:w-auto md:flex-col md:overflow-visible md:px-2 md:py-2",
          className
        )}
      >
        {TOOL_GROUPS.map((group, gi) => (
          <div
            key={gi}
            className={cn(
              "flex items-center rounded-xl border border-transparent p-0.5 transition-colors duration-200",
              "md:w-full md:flex-col",
              gi > 0 && "ml-0.5 md:ml-0 md:mt-1.5"
            )}
          >
            {gi > 0 && (
              <div className="mx-1 h-7 border-l border-white/10 md:mx-2 md:my-1.5 md:h-auto md:w-full md:border-l-0 md:border-t" />
            )}
            {group.map((id) => {
              const isActive = activeTool === id;
              const Icon = TOOL_ICONS[id];
              return (
                <div
                  key={id}
                  className="relative flex items-center justify-center px-0.5 md:w-full md:px-0.5 md:py-0.5"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          if (id === "image") {
                            const shouldOpenAssets = !isActive || !imageAssetsOpen;
                            onSelectTool(shouldOpenAssets ? "image" : null);
                            if (shouldOpenAssets && typeof window !== "undefined") {
                              window.dispatchEvent(new CustomEvent("gifalchemy:open-image-assets"));
                            }
                            return;
                          }
                          const nextTool = isActive ? null : id;
                          onSelectTool(nextTool);
                        }}
                        aria-label={TOOL_LABELS[id]}
                        className={cn(
                          "group relative flex h-10 w-10 items-center justify-center rounded-xl border border-transparent transition-all duration-200 ease-out",
                          "md:h-auto md:w-full md:flex-col md:gap-1 md:rounded-xl md:px-1.5 md:py-2.5",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          "active:scale-[0.97]",
                          "before:absolute before:left-1/2 before:top-0.5 before:h-0.5 before:w-4 before:-translate-x-1/2 before:rounded-full before:bg-primary/80 before:opacity-0 before:transition-opacity before:duration-150",
                          "md:before:left-0.5 md:before:top-1/2 md:before:h-4 md:before:w-0.5 md:before:-translate-x-0 md:before:-translate-y-1/2",
                          isActive
                            ? [
                                "border-primary/40 bg-primary/15 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.2)]",
                                "before:opacity-100",
                              ]
                            : "text-white/60 hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {Icon && (
                          <Icon
                            className={cn(
                              "h-[18px] w-[18px] md:h-5 md:w-5 shrink-0 transition-transform duration-200",
                              "group-active:scale-95 text-current",
                              !isActive && "group-hover:text-white"
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            "hidden max-w-full truncate text-center text-[11px] font-medium tracking-[0.02em] md:block mt-0.5",
                            isActive ? "text-primary" : "text-white/60 group-hover:text-white"
                          )}
                        >
                          {TOOL_LABELS[id]}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="rounded-md border-border/60 md:hidden"
                    >
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
