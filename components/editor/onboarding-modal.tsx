"use client";

import { Button } from "@/components/ui/button";
import { EditorModal } from "./editor-modal";
import { EDITOR_LABELS } from "@/lib/i18n/editor-labels";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onOpenShortcuts: () => void;
}

export function OnboardingModal({ open, onClose, onOpenShortcuts }: OnboardingModalProps) {
  return (
    <EditorModal
      open={open}
      onClose={onClose}
      title={EDITOR_LABELS.onboarding.title}
      description={EDITOR_LABELS.onboarding.description}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onOpenShortcuts}>
            {EDITOR_LABELS.onboarding.openShortcuts}
          </Button>
          <Button type="button" onClick={onClose}>
            {EDITOR_LABELS.onboarding.dismiss}
          </Button>
        </>
      }
    >
      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-3 ml-1">
          {EDITOR_LABELS.onboarding.tipHeading}
        </h3>
        <ul className="space-y-2.5">
          <li className="rounded-[12px] border border-white/5 bg-white/[0.02] p-4 text-sm text-foreground/90 leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            {EDITOR_LABELS.onboarding.tipUpload}
          </li>
          <li className="rounded-[12px] border border-white/5 bg-white/[0.02] p-4 text-sm text-foreground/90 leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            {EDITOR_LABELS.onboarding.tipTrim}
          </li>
          <li className="rounded-[12px] border border-white/5 bg-white/[0.02] p-4 text-sm text-foreground/90 leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            {EDITOR_LABELS.onboarding.tipExport}
          </li>
        </ul>
      </section>
    </EditorModal>
  );
}
