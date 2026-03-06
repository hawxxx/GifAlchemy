"use client";
import { ResizeToolPanel } from "./resize-tool-panel";
import { TrimToolPanel } from "./trim-tool-panel";
import { TextToolPanel } from "./text-tool-panel";
import { ImageOverlayPanel } from "./image-overlay-panel";
import { OptimizeToolPanel } from "./optimize-tool-panel";
import { StickersToolPanel } from "./stickers-tool-panel";
import { TemplatesToolPanel } from "./templates-tool-panel";
import { BatchToolPanel } from "./batch-tool-panel";
import { AssetLibraryPanel } from "./asset-library-panel";
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

  const sectionCardClass =
    "content-visibility-auto relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 shadow-[var(--shadow-sm)]";
  const sectionTitleClass =
    "mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]";

  return (
    <aside
      className={cn(
        "editor-chrome relative flex flex-col overflow-auto rounded-2xl border border-border/60 bg-gradient-to-b from-card/95 via-card/88 to-card/82 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.72)] backdrop-blur-xl",
        "ring-1 ring-black/[0.03] dark:ring-white/[0.05]",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/35 dark:ring-white/[0.08]"
      />

      <div className="sticky top-0 z-10 shrink-0 border-b border-border/60 bg-gradient-to-b from-card/98 via-card/94 to-card/88 px-5 py-4 shadow-[inset_0_-1px_0_0_rgba(15,23,42,0.08)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/92">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/72">
              Inspector
            </p>
            <h2 className="mt-1.5 text-[17px] font-semibold leading-tight tracking-[-0.012em] text-foreground">
              {activeToolTitle}
            </h2>
          </div>
          {metadata && (
            <p className="rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-[11px] font-medium tabular-nums text-muted-foreground/92 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]">
              {metadata.width}×{metadata.height}
            </p>
          )}
        </div>
      </div>

      <div className="relative flex flex-col gap-3.5 p-4">
        <section className={sectionCardClass}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent dark:via-white/12"
          />
          <h3 className={sectionTitleClass}>
            File info
          </h3>
          {metadata ? (
            <ul className="space-y-2.5 text-[13px] leading-5">
              <li className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground/78">Dimensions</span>
                <span className="font-medium tabular-nums tracking-[0.01em] text-foreground">
                  {metadata.width} x {metadata.height}
                </span>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground/78">Frames</span>
                <span className="font-medium tabular-nums tracking-[0.01em] text-foreground">
                  {metadata.frameCount}
                </span>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground/78">Size</span>
                <span className="font-medium tabular-nums tracking-[0.01em] text-foreground">
                  {formatBytes(metadata.fileSize)}
                </span>
              </li>
              <li
                className="truncate pt-1 text-[11px] tracking-[0.01em] text-muted-foreground/86"
                title={metadata.fileName}
              >
                {metadata.fileName}
              </li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground/90">No file loaded</p>
          )}
        </section>

        <section className={sectionCardClass}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent dark:via-white/12"
          />
          <h3 className={sectionTitleClass}>
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
            <p className="text-sm text-muted-foreground/90">Select a tool from the left</p>
          )}
        </section>

        <section className={sectionCardClass}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent dark:via-white/12"
          />
          <h3 className={sectionTitleClass}>
            Output preset
          </h3>
          <p className="text-[13px] leading-relaxed text-muted-foreground/88">
            Output size is set in the Resize tool. Format: {outputSettings.format}.
          </p>
        </section>

        <section className={sectionCardClass}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent dark:via-white/12"
          />
          <h3 className={sectionTitleClass}>
            Library
          </h3>
          <AssetLibraryPanel />
        </section>
      </div>
    </aside>
  );
}
