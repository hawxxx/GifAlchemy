"use client";

import { Separator } from "@/components/ui/separator";
import { ResizeToolPanel } from "./resize-tool-panel";
import { TrimToolPanel } from "./trim-tool-panel";
import { TextToolPanel } from "./text-tool-panel";
import type { GifMetadata } from "@/core/domain/gif-types";
import type { OutputSettings } from "@/core/domain/project";
import type { ToolId } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
  return (
    <aside
      className={cn(
        "flex flex-col overflow-auto border-l border-border/50 bg-muted/20 rounded-l-xl p-4 gap-4",
        className
      )}
    >
      <section className="content-visibility-auto">
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">
          File info
        </h3>
        {metadata ? (
          <ul className="text-sm space-y-1 text-foreground">
            <li>{metadata.width} × {metadata.height}</li>
            <li>{metadata.frameCount} frames</li>
            <li>{formatBytes(metadata.fileSize)}</li>
            <li className="truncate" title={metadata.fileName}>{metadata.fileName}</li>
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No file loaded</p>
        )}
      </section>
      <Separator />
      <section className="content-visibility-auto">
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">
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
        {activeTool === "text" && <TextToolPanel />}
        {activeTool !== "resize" && activeTool !== "trim" && activeTool !== "text" && (
          <p className="text-xs text-muted-foreground">Select a tool from the left</p>
        )}
      </section>
      <Separator />
      <section className="content-visibility-auto">
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Output preset
        </h3>
        <p className="text-xs text-muted-foreground">
          Output size is set in the Resize tool. Format: {outputSettings.format}.
        </p>
      </section>
    </aside>
  );
}
