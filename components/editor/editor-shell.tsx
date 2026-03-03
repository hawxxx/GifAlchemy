"use client";

import { useEffect, useRef } from "react";
import { EditorTopBar } from "./editor-top-bar";
import { ToolsRail } from "./tools-rail";
import { CanvasStage } from "./canvas-stage";
import { PropertiesPanel } from "./properties-panel";
import { TimelinePanel } from "./timeline-panel";
import { NextStepsMenu } from "./next-steps-menu";
import { useEditor } from "@/hooks/use-editor";
import { useAutosave } from "@/hooks/use-autosave";
import { useRestoreProject } from "@/hooks/use-restore-project";
import { useEditorKeyboard } from "@/hooks/use-editor-keyboard";
import { cn } from "@/lib/utils";

export function EditorShell({ className }: { className?: string }) {
  const { state, dispatch } = useEditor();
  const { saveStatus } = useAutosave();
  const urlRateInitialized = useRef(false);

  useRestoreProject();
  useEditorKeyboard();

  useEffect(() => {
    if (urlRateInitialized.current || typeof window === "undefined") return;
    urlRateInitialized.current = true;
    const params = new URLSearchParams(window.location.search);
    const raw = Number(params.get("speed"));
    if ([0.5, 1, 1.5, 2].includes(raw)) {
      dispatch({ type: "SET_PLAYBACK_RATE", payload: raw });
    }
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("speed", String(state.playbackRate));
    window.history.replaceState({}, "", url.toString());
  }, [state.playbackRate]);

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
