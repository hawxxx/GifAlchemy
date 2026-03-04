"use client";

import { useEffect, useRef, useState } from "react";
import { EditorTopBar } from "./editor-top-bar";
import { ToolsRail } from "./tools-rail";
import { CanvasStage } from "./canvas-stage";
import { PropertiesPanel } from "./properties-panel";
import { TimelinePanel } from "./timeline-panel";
import { NextStepsMenu } from "./next-steps-menu";
import { OnboardingModal } from "./onboarding-modal";
import { KeyboardShortcutsModal } from "./keyboard-shortcuts-modal";
import { useEditor } from "@/hooks/use-editor";
import { useAutosave } from "@/hooks/use-autosave";
import { useRestoreProject } from "@/hooks/use-restore-project";
import { useEditorKeyboard } from "@/hooks/use-editor-keyboard";
import { useProjectPersistence } from "@/hooks/use-project-persistence";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "gifalchemy:onboarding:v1";

export function EditorShell({ className }: { className?: string }) {
  const { state, dispatch } = useEditor();
  const { saveStatus } = useAutosave();
  const urlRateInitialized = useRef(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useRestoreProject();
  useEditorKeyboard();
  useProjectPersistence();

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(ONBOARDING_KEY);
    if (!seen) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    const openShortcuts = () => setShowShortcuts(true);
    window.addEventListener("gifalchemy:open-shortcuts", openShortcuts);
    return () => window.removeEventListener("gifalchemy:open-shortcuts", openShortcuts);
  }, []);

  const dismissOnboarding = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_KEY, "seen");
    }
    setShowOnboarding(false);
  };

  return (
    <div
      className={cn(
        "h-screen flex flex-col overflow-hidden bg-background text-foreground",
        className
      )}
    >
      <EditorTopBar
        projectName={state.projectName}
        saveStatus={saveStatus}
        onProjectNameChange={(name) => dispatch({ type: "SET_PROJECT_NAME", payload: name })}
      />

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-3 overflow-hidden border-y border-border/40 px-3 py-3 transition-colors duration-200",
          "bg-[linear-gradient(180deg,var(--background-0)_0%,var(--background-1)_100%)]",
          "[grid-template-columns:minmax(0,1fr)] [grid-template-rows:auto_minmax(0,1fr)_minmax(220px,auto)]",
          "md:px-4 md:py-4 md:[grid-template-columns:64px_minmax(0,1fr)_320px] md:[grid-template-rows:minmax(0,1fr)]"
        )}
      >
        <ToolsRail
          activeTool={state.activeTool}
          onSelectTool={(tool) => dispatch({ type: "SET_TOOL", payload: tool })}
        />

        <div className="min-h-0 overflow-hidden rounded-2xl border border-border/55 bg-card/92 shadow-[0_18px_34px_-26px_rgba(0,0,0,0.72)] ring-1 ring-black/[0.03] transition-all duration-200 dark:ring-white/[0.04]">
          <CanvasStage />
        </div>

        <PropertiesPanel
          activeTool={state.activeTool}
          metadata={state.metadata}
          outputSettings={state.outputSettings}
          onOutputSettingsChange={(updates) =>
            dispatch({ type: "UPDATE_OUTPUT_SETTINGS", payload: updates })
          }
        />
      </div>

      <div className="shrink-0 border-t border-border/40 bg-muted/10 px-3 pb-3 pt-2 md:px-4 md:pb-4">
        <div className="h-[160px] overflow-hidden rounded-2xl border border-border/55 bg-card/90 shadow-[0_16px_30px_-24px_rgba(0,0,0,0.75)] ring-1 ring-black/[0.03] transition-all duration-200 md:h-[176px] dark:ring-white/[0.04]">
          <TimelinePanel />
        </div>
      </div>

      <NextStepsMenu />

      <OnboardingModal
        open={showOnboarding}
        onClose={dismissOnboarding}
        onOpenShortcuts={() => {
          dismissOnboarding();
          setShowShortcuts(true);
        }}
      />

      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
