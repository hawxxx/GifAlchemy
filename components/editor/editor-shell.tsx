"use client";

import { EditorTopBar } from "./editor-top-bar";
import { ToolsRail } from "./tools-rail";
import { CanvasStage } from "./canvas-stage";
import { PropertiesPanel } from "./properties-panel";
import { TimelinePanel } from "./timeline-panel";
import { NextStepsMenu } from "./next-steps-menu";
import { useEditor } from "@/hooks/use-editor";
import { useAutosave } from "@/hooks/use-autosave";
import { cn } from "@/lib/utils";

export function EditorShell({ className }: { className?: string }) {
  const { state, dispatch } = useEditor();
  const { saveStatus } = useAutosave();

  return (
    <div
      className={cn(
        "h-screen flex flex-col bg-background text-foreground overflow-hidden",
        className
      )}
    >
      {/* Top bar — spans full width */}
      <EditorTopBar
        projectName={state.projectName}
        saveStatus={saveStatus}
        onProjectNameChange={(name) => dispatch({ type: "SET_PROJECT_NAME", payload: name })}
      />

      {/* Main area: tools rail + canvas + properties, stacked above timeline */}
      <div
        className="grid flex-1 min-h-0 overflow-hidden"
        style={{
          gridTemplateColumns: "56px 1fr 300px",
          gridTemplateRows: "1fr",
        }}
      >
        {/* Tools rail */}
        <ToolsRail
          activeTool={state.activeTool}
          onSelectTool={(tool) => dispatch({ type: "SET_TOOL", payload: tool })}
        />

        {/* Canvas */}
        <div className="min-h-0 overflow-hidden">
          <CanvasStage />
        </div>

        {/* Properties panel */}
        <PropertiesPanel
          activeTool={state.activeTool}
          metadata={state.metadata}
          outputSettings={state.outputSettings}
          onOutputSettingsChange={(updates) =>
            dispatch({ type: "UPDATE_OUTPUT_SETTINGS", payload: updates })
          }
        />
      </div>

      {/* Timeline — full width at bottom, fixed height */}
      <div className="shrink-0" style={{ height: 170 }}>
        <TimelinePanel />
      </div>

      <NextStepsMenu />
    </div>
  );
}
