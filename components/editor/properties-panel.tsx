"use client";
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
  const activeToolTitle = activeTool
    ? (TOOL_DISPLAY_NAMES[activeTool] ?? activeTool)
    : "Properties";

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
        "flex flex-col overflow-auto rounded-2xl border border-border/60 bg-card/90 shadow-sm ring-1 ring-black/[0.03] backdrop-blur supports-[backdrop-filter]:bg-card/80 dark:ring-white/[0.04]",
        className
      )}
    >
      {/* Panel header */}
      <div className="sticky top-0 z-10 shrink-0 border-b border-border/55 bg-card/95 px-5 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/90">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/75">
          Inspector
        </p>
        <h2 className="mt-1 text-sm font-semibold tracking-tight text-foreground">
          {activeToolTitle}
        </h2>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <section className="content-visibility-auto rounded-xl border border-border/55 bg-background/55 p-3.5 shadow-[inset_0_1px_0_0_theme(colors.background/70)]">
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
            File info
          </h3>
          {metadata ? (
            <ul className="space-y-1.5 text-sm leading-5 text-foreground">
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

        <section className="content-visibility-auto rounded-xl border border-border/55 bg-background/55 p-3.5 shadow-[inset_0_1px_0_0_theme(colors.background/70)]">
          <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
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

        <section className="content-visibility-auto rounded-xl border border-border/55 bg-background/55 p-3.5 shadow-[inset_0_1px_0_0_theme(colors.background/70)]">
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
            Output preset
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Output size is set in the Resize tool. Format: {outputSettings.format}.
          </p>
        </section>
      </div>
    </aside>
  );
}
