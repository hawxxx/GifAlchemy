"use client";

import { Separator } from "@/components/ui/separator";
import { ResizeToolPanel } from "./resize-tool-panel";
import { TrimToolPanel } from "./trim-tool-panel";
import { TextToolPanel } from "./text-tool-panel";
import { OptimizeToolPanel } from "./optimize-tool-panel";
import { StickersToolPanel } from "./stickers-tool-panel";
import { TemplatesToolPanel } from "./templates-tool-panel";
import { BatchToolPanel } from "./batch-tool-panel";
import type { GifMetadata } from "@/core/domain/gif-types";
import type { OutputSettings } from "@/core/domain/project";
import type { ToolId } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  resize: "Resize",
  trim: "Trim",
  optimize: "Optimize",
  text: "Text Overlays",
  stickers: "Stickers",
  templates: "Templates",
  batch: "Batch Export",
};

export interface PropertiesPanelProps {
  activeTool: ToolId | null;
  metadata: GifMetadata | null;
  outputSettings: OutputSettings;
  onOutputSettingsChange: (updates: Partial<OutputSettings>) => void;
  className?: string;
}

export function PropertiesPanel({
  activeTool,
  metadata,
  outputSettings,
  onOutputSettingsChange,
  className,
}: PropertiesPanelProps) {
  const noTool =
    activeTool !== "resize" &&
    activeTool !== "trim" &&
    activeTool !== "optimize" &&
    activeTool !== "text" &&
    activeTool !== "stickers" &&
    activeTool !== "templates" &&
    activeTool !== "batch";

  return (
    <aside
      className={cn(
        "flex flex-col overflow-auto border-l border-border/40 bg-card rounded-l-xl",
        className
      )}
    >
      {/* Panel header */}
      <div className="flex items-center px-4 py-3 border-b border-border/40 shrink-0">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/70">
          {activeTool ? (TOOL_DISPLAY_NAMES[activeTool] ?? activeTool) : "Properties"}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <section className="content-visibility-auto">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
            File info
          </h3>
          {metadata ? (
            <ul className="text-sm space-y-1 text-foreground">
              <li>{metadata.width} × {metadata.height}</li>
              <li>{metadata.frameCount} frames</li>
              <li>{formatBytes(metadata.fileSize)}</li>
              <li className="truncate text-xs text-muted-foreground" title={metadata.fileName}>
                {metadata.fileName}
              </li>
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No file loaded</p>
          )}
        </section>

        <Separator className="bg-border/40" />

        <section className="content-visibility-auto">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">
            Active tool
          </h3>
          {activeTool === "resize" && (
            <ResizeToolPanel
              outputSettings={outputSettings}
              metadata={metadata}
              onOutputSettingsChange={onOutputSettingsChange}
            />
          )}
          {activeTool === "trim" && <TrimToolPanel />}
          {activeTool === "optimize" && <OptimizeToolPanel />}
          {activeTool === "text" && <TextToolPanel />}
          {activeTool === "stickers" && <StickersToolPanel />}
          {activeTool === "templates" && <TemplatesToolPanel />}
          {activeTool === "batch" && <BatchToolPanel />}
          {noTool && (
            <p className="text-xs text-muted-foreground">Select a tool from the left</p>
          )}
        </section>

        <Separator className="bg-border/40" />

        <section className="content-visibility-auto">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
            Output preset
          </h3>
          <p className="text-xs text-muted-foreground">
            Output size is set in the Resize tool. Format: {outputSettings.format}.
          </p>
        </section>
      </div>
    </aside>
  );
}
