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
          <li key={shortcut.keys} className="rounded-[12px] border border-white/5 bg-white/[0.02] p-3 flex flex-col justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1">{shortcut.keys}</p>
            <p className="text-sm text-foreground/90 font-medium">{shortcut.description}</p>
          </li>
        ))}
      </ul>
    </EditorModal>
  );
}
