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
          "animate-panel-in flex w-full items-center gap-1.5 overflow-x-auto rounded-[24px] border border-white/10 px-2 py-2",
          "bg-[#0d121a]/60 backdrop-blur-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300",
          "md:w-auto md:flex-col md:overflow-visible md:px-2 md:py-3",
          className
        )}
      >
        {TOOL_GROUPS.map((group, gi) => (
          <div
            key={gi}
            className={cn(
              "flex items-center transition-colors duration-200",
              "md:w-full md:flex-col",
              gi > 0 && "ml-1 md:ml-0 md:mt-2"
            )}
          >
            {gi > 0 && (
              <div className="mx-1 h-8 border-l border-white/[0.08] md:mx-0 md:my-2 md:h-px md:w-full md:border-l-0 md:border-t" />
            )}
            <div className="flex items-center gap-1 md:flex-col md:w-full">
              {group.map((id) => {
                const isActive = activeTool === id;
                const Icon = TOOL_ICONS[id];
                return (
                  <div
                    key={id}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left - rect.width / 2;
                      const y = e.clientY - rect.top - rect.height / 2;
                      e.currentTarget.style.setProperty("--mx", `${x * 0.35}px`);
                      e.currentTarget.style.setProperty("--my", `${y * 0.35}px`);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.setProperty("--mx", "0px");
                      e.currentTarget.style.setProperty("--my", "0px");
                    }}
                    className="relative flex items-center justify-center md:w-full group/magnetic"
                    style={{ perspective: "1000px" }}
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
                            "group relative flex h-11 w-11 items-center justify-center rounded-[18px] border border-transparent transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
                            "md:h-auto md:w-full md:flex-col md:gap-1.5 md:px-1.5 md:py-3",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d121a]",
                            "active:scale-95 active:rotate-[-2deg]",
                            "before:absolute before:left-0 before:top-1/2 before:h-2/3 before:w-0.5 before:-translate-y-1/2 before:rounded-r-full before:bg-primary before:opacity-0 before:transition-all before:duration-300 before:content-['']",
                            isActive
                              ? [
                                  "border-primary/50 bg-primary/20 text-primary shadow-[0_8px_24px_-4px_rgba(var(--primary-rgb),0.3),inset_0_1px_0_rgba(255,255,255,0.15)]",
                                  "before:opacity-100 before:h-8",
                                ]
                              : "text-white/40 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-white"
                          )}
                          style={{
                            transform: "translate3d(var(--mx, 0), var(--my, 0), 0)",
                          }}
                        >
                          {Icon && (
                            <Icon
                              className={cn(
                                "h-5 w-5 md:h-[22px] md:w-[22px] shrink-0 transition-all duration-300",
                                "group-active:scale-90 text-current",
                                isActive ? "scale-110 drop-shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)]" : "group-hover:scale-110 group-hover:text-white"
                              )}
                            />
                          )}
                          <span
                            className={cn(
                              "hidden max-w-full truncate text-center text-[9px] uppercase font-black tracking-[0.08em] md:block mt-1",
                              isActive ? "text-primary opacity-100" : "text-white/30 opacity-60 group-hover:opacity-100 group-hover:text-white"
                            )}
                          >
                            {TOOL_LABELS[id]}
                          </span>
                          
                          {/* Magnetic Reflection Glare */}
                          <div className="absolute inset-0 pointer-events-none rounded-[18px] opacity-0 group-hover/magnetic:opacity-100 transition-opacity bg-[radial-gradient(circle_at_var(--mx)_var(--my),rgba(255,255,255,0.1)_0%,transparent_70%)]" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="rounded-lg border-white/10 bg-[#0d121a]/95 backdrop-blur-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest md:hidden"
                      >
                        {TOOL_LABELS[id]}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </aside>
    </TooltipProvider>
  );
}
