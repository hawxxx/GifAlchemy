"use client";

import { Button } from "@/components/ui/button";
import { EditorModal } from "./editor-modal";
import { EDITOR_LABELS, EDITOR_SHORTCUTS } from "@/lib/i18n/editor-labels";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  return (
    <EditorModal
      open={open}
      onClose={onClose}
      title={EDITOR_LABELS.shortcuts.title}
      description={EDITOR_LABELS.shortcuts.description}
      footer={
        <Button type="button" onClick={onClose}>
          {EDITOR_LABELS.shortcuts.close}
        </Button>
      }
    >
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {EDITOR_SHORTCUTS.map((shortcut) => (
          <li key={shortcut.keys} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">{shortcut.keys}</p>
            <p className="text-sm text-foreground">{shortcut.description}</p>
          </li>
        ))}
      </ul>
    </EditorModal>
  );
}
