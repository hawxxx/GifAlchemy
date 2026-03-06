"use client";

import { Button } from "@/components/ui/button";
import { EDITOR_LABELS } from "@/lib/i18n/editor-labels";

const TOUR_STEPS = [
  {
    id: "topbar",
    title: "Project controls",
    description: "Rename, reopen recent projects, and inspect version history from the top bar.",
    className: "top-20 left-1/2 w-[320px] -translate-x-1/2",
  },
  {
    id: "tools",
    title: "Tools and layers",
    description: "Use the left rail to switch modes quickly. Text and image tools are the fastest way to build overlays.",
    className: "left-6 top-32 w-[300px] md:left-24",
  },
  {
    id: "timeline",
    title: "Timeline and preview",
    description: "Trim ranges, scrub frames, and switch into Preview mode for a clean playback pass.",
    className: "bottom-40 left-1/2 w-[340px] -translate-x-1/2",
  },
] as const;

interface GuidedOnboardingProps {
  stepIndex: number;
  onNext: () => void;
  onSkip: () => void;
}

export function GuidedOnboarding({ stepIndex, onNext, onSkip }: GuidedOnboardingProps) {
  const step = TOUR_STEPS[stepIndex];
  if (!step) return null;

  return (
    <>
      <div className="pointer-events-auto absolute inset-0 z-[190] bg-[rgba(4,7,12,0.42)] backdrop-blur-[2px]" />
      <div className={`pointer-events-auto absolute z-[200] ${step.className}`}>
        <div className="rounded-2xl border border-white/10 bg-[rgba(17,22,30,0.96)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl animate-panel-in">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
            {EDITOR_LABELS.onboarding.tourLabel}
          </p>
          <h3 className="mt-2 text-base font-semibold text-white/92">{step.title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/68">{step.description}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
              {stepIndex + 1} / {TOUR_STEPS.length}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={onSkip}>
                {EDITOR_LABELS.onboarding.skipTour}
              </Button>
              <Button type="button" size="sm" className="h-8 px-3 text-xs" onClick={onNext}>
                {stepIndex === TOUR_STEPS.length - 1
                  ? EDITOR_LABELS.onboarding.finishTour
                  : EDITOR_LABELS.onboarding.nextTour}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
