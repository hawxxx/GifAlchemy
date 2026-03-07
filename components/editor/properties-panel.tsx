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

  const sectionClass =
    "relative flex flex-col px-5 py-4 border-b border-white/5 last:border-b-0 group";
  const sectionTitleClass =
    "mb-3.5 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 group-hover:text-white/40 transition-colors";

  return (
    <aside
      className={cn(
        "editor-chrome relative flex flex-col overflow-auto rounded-none border-l border-white/10 bg-[#0a0a0a]/90 shadow-2xl backdrop-blur-3xl xl:w-80",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 shadow-[inset_1px_0_0_rgba(255,255,255,0.02)]"
      />

      {/* Header */}
      <div className="sticky top-0 z-10 shrink-0 border-b border-white/10 bg-black/40 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[14px] font-semibold tracking-wide text-white/90">
              {activeToolTitle}
            </h2>
            <p className="text-[11px] font-medium text-white/40">
              Inspector
            </p>
          </div>
          {metadata && (
            <div className="flex h-6 items-center rounded-md bg-white/[0.04] px-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border border-white/5">
              <span className="text-[10px] font-bold tabular-nums tracking-wider text-white/70">
                {metadata.width}×{metadata.height}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="relative flex flex-col gap-5 p-5">
        {/* File Info Card */}
        <section className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.05] hover:border-white/20">
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 group-hover:text-white/50 transition-colors">
            <div className="h-1 w-3 rounded-full bg-white/10" />
            File Metadata
          </h3>
          {metadata ? (
            <div className="grid grid-cols-2 gap-y-4">
              <div className="space-y-1">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-white/20">Dimensions</span>
                <span className="block text-xs font-semibold tabular-nums text-white/90">{metadata.width} × {metadata.height}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-white/20">Total Frames</span>
                <span className="block text-xs font-semibold tabular-nums text-white/90">{metadata.frameCount} @ 30fps</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-white/20">Source Size</span>
                <span className="block text-xs font-semibold tabular-nums text-white/90">{formatBytes(metadata.fileSize)}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-white/20">Format</span>
                <span className="block text-xs font-semibold uppercase tracking-wider text-primary/80">GIF 89a</span>
              </div>
              <div className="col-span-2 mt-2 truncate rounded-lg bg-black/40 px-3 py-2 text-[10px] font-medium text-white/30 border border-white/5" title={metadata.fileName}>
                {metadata.fileName}
              </div>
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
              <span className="text-[11px] font-medium text-white/20">No media processed</span>
            </div>
          )}
        </section>

        {/* Dynamic Tool Controls Card */}
        <section className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all">
          <h3 className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
            <div className="h-1 w-3 rounded-full bg-primary/40 animate-pulse" />
            Selection Parameters
          </h3>
          <div className="flex flex-col">
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
              <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-40">
                <div className="h-12 w-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-white/40" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.15em]">Select an Actor</span>
              </div>
            )}
          </div>
        </section>

        {/* Output Settings Sub-Card */}
        <section className="group relative overflow-hidden rounded-2xl border border-white/5 bg-black/20 p-4 transition-all hover:bg-black/40">
          <div className="flex items-center justify-between mb-3">
             <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20">Output Strategy</h3>
             <div className="rounded-full bg-primary/10 px-2 py-0.5 border border-primary/20">
               <span className="text-[9px] font-black text-primary uppercase">{outputSettings.format}</span>
             </div>
          </div>
          <p className="text-[11px] leading-relaxed text-white/30">
            Production dimensions are calculated relative to the primary canvas constraints.
          </p>
        </section>
      </div>
    </aside>
  );
}
