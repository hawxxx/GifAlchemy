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
import { GuidedOnboarding } from "./guided-onboarding";
import { useEditor } from "@/hooks/use-editor";
import { useAutosave } from "@/hooks/use-autosave";
import { useRestoreProject } from "@/hooks/use-restore-project";
import { useEditorKeyboard } from "@/hooks/use-editor-keyboard";
import { useProjectPersistence } from "@/hooks/use-project-persistence";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "gifalchemy:onboarding:v1";
const ONBOARDING_TOUR_KEY = "gifalchemy:onboarding-tour:v1";

export function EditorShell({ className }: { className?: string }) {
  const { state, dispatch, projectRepo } = useEditor();
  const { saveStatus } = useAutosave();
  const urlRateInitialized = useRef(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

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
    if (seen) return;

    let cancelled = false;

    const shouldSuppressOnboarding = async () => {
      const params = new URLSearchParams(window.location.search);
      const hasExplicitProject = Boolean(params.get("project"));
      const isExplicitNew = params.get("intent") === "new";
      const hasEditorContent = state.frames.length > 0 || state.status !== "empty";

      if (hasExplicitProject || hasEditorContent) return true;
      if (isExplicitNew) return false;
      if (!projectRepo) return false;

      const savedProjects = await projectRepo.list();
      return savedProjects.length > 0;
    };

    void shouldSuppressOnboarding()
      .then((shouldSuppress) => {
        if (!cancelled && !shouldSuppress) {
          setShowOnboarding(true);
        }
      })
      .catch(() => {
        if (!cancelled && state.frames.length === 0 && state.status === "empty") {
          setShowOnboarding(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectRepo, state.frames.length, state.status]);

  useEffect(() => {
    if (state.frames.length > 0 || state.status !== "empty") {
      setShowOnboarding(false);
      setShowTour(false);
      setTourStep(0);
    }
  }, [state.frames.length, state.status]);

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
    if (typeof window !== "undefined" && !window.localStorage.getItem(ONBOARDING_TOUR_KEY)) {
      const params = new URLSearchParams(window.location.search);
      const isExplicitNew = params.get("intent") === "new";
      const hasEditorContent = state.frames.length > 0 || state.status !== "empty";
      if (isExplicitNew || !hasEditorContent) {
        setShowTour(true);
      }
    }
  };

  const dismissTour = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_TOUR_KEY, "seen");
    }
    setShowTour(false);
    setTourStep(0);
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
        className={cn(
          "transition-opacity duration-[var(--duration-ui)]",
          state.isPreviewMode && "opacity-25"
        )}
        onProjectNameChange={(name) => dispatch({ type: "SET_PROJECT_NAME", payload: name })}
      />

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-3 overflow-hidden border-y border-[var(--border-subtle)] px-3 py-3 transition-colors duration-[var(--duration-ui)]",
          "bg-[var(--background-0)]",
          "[grid-template-columns:minmax(0,1fr)] [grid-template-rows:auto_minmax(0,1fr)_minmax(220px,auto)]",
          "md:px-4 md:py-4 md:[grid-template-columns:88px_minmax(0,1fr)_320px] md:[grid-template-rows:minmax(0,1fr)]"
        )}
      >
        <ToolsRail
          activeTool={state.activeTool}
          onSelectTool={(tool) => dispatch({ type: "SET_TOOL", payload: tool })}
          className={cn(
            "transition-all duration-[var(--duration-ui)]",
            state.isPreviewMode && "pointer-events-none opacity-15 scale-[0.98]"
          )}
        />

        <div className={cn(
          "surface-sheen animate-panel-in min-h-0 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-0)] shadow-[var(--shadow-lg)] transition-all duration-[var(--duration-ui)]",
          state.isPreviewMode && "ring-1 ring-white/10 shadow-[0_30px_70px_rgba(0,0,0,0.6)]"
        )}>
          <CanvasStage />
        </div>

        <PropertiesPanel
          className={cn(
            "transition-all duration-[var(--duration-ui)]",
            state.isPreviewMode && "pointer-events-none opacity-15 scale-[0.985]"
          )}
          activeTool={state.activeTool}
          metadata={state.metadata}
          outputSettings={state.outputSettings}
          onOutputSettingsChange={(updates) =>
            dispatch({ type: "UPDATE_OUTPUT_SETTINGS", payload: updates })
          }
        />
      </div>

      <div className={cn(
        "shrink-0 border-t border-[var(--border-subtle)] bg-[var(--background-1)] px-3 pb-3 pt-2 md:px-4 md:pb-4 transition-opacity duration-[var(--duration-ui)]",
        state.isPreviewMode && "pointer-events-none opacity-10"
      )}>
        <div className="animate-panel-in h-[160px] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[var(--shadow-md)] transition-all duration-[var(--duration-ui)] md:h-[176px]">
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
      {showTour && (
        <GuidedOnboarding
          stepIndex={tourStep}
          onSkip={dismissTour}
          onNext={() => {
            if (tourStep >= 2) {
              dismissTour();
              return;
            }
            setTourStep((step) => step + 1);
          }}
        />
      )}
    </div>
  );
}
