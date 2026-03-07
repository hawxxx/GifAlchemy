"use client";

import { useEffect, useRef, useState } from "react";
import { EditorTopBar } from "./editor-top-bar";
import { ToolsRail } from "./tools-rail";
import { CanvasStage } from "./canvas-stage";
import { PropertiesPanel } from "./properties-panel";
import { TimelinePanel } from "./timeline-panel";
import { NextStepsMenu } from "./next-steps-menu";
import { HUDCommandPalette } from "./hud-command-palette";
import { OnboardingModal } from "./onboarding-modal";
import { KeyboardShortcutsModal } from "./keyboard-shortcuts-modal";
import { GuidedOnboarding } from "./guided-onboarding";
import { ImageAssetsSubmenu } from "./image-assets-submenu";
import { useEditor } from "@/hooks/use-editor";
import { useAutosave } from "@/hooks/use-autosave";
import { useRestoreProject } from "@/hooks/use-restore-project";
import { useLoadingTimeout } from "@/hooks/use-loading-timeout";
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
  const [showImageAssets, setShowImageAssets] = useState(false);

  useRestoreProject();
  useLoadingTimeout();
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

  useEffect(() => {
    const openImageAssets = () => setShowImageAssets(true);
    window.addEventListener("gifalchemy:open-image-assets", openImageAssets);
    return () => window.removeEventListener("gifalchemy:open-image-assets", openImageAssets);
  }, []);

  useEffect(() => {
    if (state.activeTool !== "image" || state.isPreviewMode) {
      setShowImageAssets(false);
    }
  }, [state.activeTool, state.isPreviewMode]);

  const dismissOnboarding = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_KEY, "seen");
    }
    setShowOnboarding(false);
    if (typeof window !== "undefined" && !window.localStorage.getItem(ONBOARDING_TOUR_KEY)) {
      const params = new URLSearchParams(window.location.search);
      const isExplicitNew = params.get("intent") === "new";
      const hasProjectInUrl = Boolean(params.get("project"));
      const hasEditorContent = state.frames.length > 0 || state.status !== "empty";
      if ((isExplicitNew || !hasEditorContent) && !hasProjectInUrl) {
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
          "grid min-h-0 flex-1 gap-4 overflow-hidden border-y border-white/[0.04] px-4 py-4 transition-colors duration-[var(--duration-ui)]",
          "bg-[#07090d]/60 backdrop-blur-3xl",
          "shadow-[inset_0_4px_24px_rgba(0,0,0,0.5),inset_0_-4px_24px_rgba(0,0,0,0.5)]",
          "[grid-template-columns:minmax(0,1fr)] [grid-template-rows:auto_minmax(0,1fr)_minmax(220px,auto)]",
          "md:[grid-template-columns:80px_minmax(0,1fr)_320px] md:[grid-template-rows:minmax(0,1fr)]"
        )}
      >
        <div
          className={cn(
            "relative z-20",
            state.isPreviewMode && "pointer-events-none opacity-15 scale-[0.98]"
          )}
        >
          <ToolsRail
            activeTool={state.activeTool}
            imageAssetsOpen={showImageAssets}
            onSelectTool={(tool) => dispatch({ type: "SET_TOOL", payload: tool })}
            className="transition-all duration-[var(--duration-ui)]"
          />
          <ImageAssetsSubmenu open={showImageAssets} onClose={() => setShowImageAssets(false)} />
        </div>

        <div className={cn(
          "relative surface-sheen animate-panel-in min-h-0 overflow-hidden rounded-[24px] border border-white/10 bg-[#090b10] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.8)] transition-all duration-[var(--duration-ui)]",
          state.isPreviewMode && "ring-1 ring-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.7)]"
        )}>
          {/* Deep dotted grid background */}
          <div className={cn(
            "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px] transition-all duration-700",
            state.snapToGrid ? "opacity-100 scale-100" : "opacity-0 scale-110",
            "[mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_90%)]"
          )} />
          
          {/* Active Grid Overlay - Progressive disclosure */}
          {state.snapToGrid && (
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] animate-fade-in" />
          )}

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
        "shrink-0 border-t border-white/[0.03] bg-background/60 backdrop-blur-2xl px-4 pb-4 pt-1 transition-opacity duration-[var(--duration-ui)]",
        "shadow-[0_-8px_32px_rgba(0,0,0,0.3)]",
        state.isPreviewMode && "pointer-events-none opacity-10"
      )}>
        <div className="animate-panel-in h-[160px] overflow-hidden rounded-[24px] border border-white/10 bg-black/40 shadow-[0_12px_44px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-3xl transition-all duration-[var(--duration-ui)] md:h-[200px]">
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
      <HUDCommandPalette />
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
