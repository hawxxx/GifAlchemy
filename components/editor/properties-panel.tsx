"use client";
import { ResizeToolPanel } from "./resize-tool-panel";
import { TrimToolPanel } from "./trim-tool-panel";
import { TextToolPanel } from "./text-tool-panel";
import { ImageOverlayPanel } from "./image-overlay-panel";
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
  image: "Image Overlay",
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
    activeTool !== "image" &&
    activeTool !== "stickers" &&
    activeTool !== "templates" &&
    activeTool !== "batch";

  return (
    <aside
      className={cn(
        "editor-chrome flex flex-col overflow-auto rounded-2xl",
        "ring-1 ring-black/[0.03] backdrop-blur dark:ring-white/[0.04]",
        className
      )}
    >
      <div className="sticky top-0 z-10 shrink-0 border-b border-border/55 bg-gradient-to-b from-card/95 to-card/85 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/90">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/75">
              Inspector
            </p>
            <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-foreground">
              {activeToolTitle}
            </h2>
          </div>
          {metadata && (
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {metadata.width}×{metadata.height}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3 md:p-4">
        <section className="content-visibility-auto rounded-xl border border-border/55 bg-gradient-to-b from-background/70 to-background/45 p-3.5 shadow-[inset_0_1px_0_0_theme(colors.background/70)]">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/80">
            File info
          </h3>
          {metadata ? (
            <ul className="space-y-1.5 text-sm leading-5 text-foreground">
              <li className="tabular-nums">{metadata.width} × {metadata.height}</li>
              <li className="tabular-nums">{metadata.frameCount} frames</li>
              <li className="tabular-nums">{formatBytes(metadata.fileSize)}</li>
              <li className="truncate text-xs text-muted-foreground/95" title={metadata.fileName}>
                {metadata.fileName}
              </li>
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No file loaded</p>
          )}
        </section>

        <section className="content-visibility-auto rounded-xl border border-border/55 bg-gradient-to-b from-background/70 to-background/45 p-3.5 shadow-[inset_0_1px_0_0_theme(colors.background/70)]">
          <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/80">
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
          {activeTool === "image" && <ImageOverlayPanel />}
          {activeTool === "stickers" && <StickersToolPanel />}
          {activeTool === "templates" && <TemplatesToolPanel />}
          {activeTool === "batch" && <BatchToolPanel />}
          {noTool && (
            <p className="text-xs text-muted-foreground">Select a tool from the left</p>
          )}
        </section>

        <section className="content-visibility-auto rounded-xl border border-border/55 bg-gradient-to-b from-background/70 to-background/45 p-3.5 shadow-[inset_0_1px_0_0_theme(colors.background/70)]">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/80">
            Output preset
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground/95">
            Output size is set in the Resize tool. Format: {outputSettings.format}.
          </p>
        </section>
      </div>
    </aside>
  );
}
