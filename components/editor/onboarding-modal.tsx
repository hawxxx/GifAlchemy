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
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {EDITOR_LABELS.onboarding.tipHeading}
        </h3>
        <ul className="mt-2 space-y-2 text-sm text-foreground">
          <li className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            {EDITOR_LABELS.onboarding.tipUpload}
          </li>
          <li className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            {EDITOR_LABELS.onboarding.tipTrim}
          </li>
          <li className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            {EDITOR_LABELS.onboarding.tipExport}
          </li>
        </ul>
      </section>
    </EditorModal>
  );
}
