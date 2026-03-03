"use client";

import { Button } from "@/components/ui/button";
import { EditorModal } from "./editor-modal";
import { EDITOR_LABELS } from "@/lib/i18n/editor-labels";

export interface ExportDiagnostics {
  message: string;
  context: Array<{ label: string; value: string }>;
}

interface ExportDiagnosticsModalProps {
  open: boolean;
  diagnostics: ExportDiagnostics | null;
  onClose: () => void;
  onRetry: () => void;
  onRetrySafer: () => void;
  busy?: boolean;
}

export function ExportDiagnosticsModal({
  open,
  diagnostics,
  onClose,
  onRetry,
  onRetrySafer,
  busy = false,
}: ExportDiagnosticsModalProps) {
  return (
    <EditorModal
      open={open}
      onClose={onClose}
      title={EDITOR_LABELS.export.diagnosticsTitle}
      description={EDITOR_LABELS.export.diagnosticsDescription}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {EDITOR_LABELS.export.diagnosticsClose}
          </Button>
          <Button type="button" variant="secondary" onClick={onRetrySafer} disabled={busy}>
            {EDITOR_LABELS.export.diagnosticsRetrySafer}
          </Button>
          <Button type="button" onClick={onRetry} disabled={busy}>
            {busy ? EDITOR_LABELS.export.primaryBusy : EDITOR_LABELS.export.diagnosticsRetry}
          </Button>
        </>
      )}
    >
      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {EDITOR_LABELS.export.diagnosticsDetailsHeading}
          </p>
          <p className="mt-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
            {diagnostics?.message || "Unknown error"}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {EDITOR_LABELS.export.diagnosticsContextHeading}
          </p>
          <dl className="mt-1 grid grid-cols-1 gap-1 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2">
            {(diagnostics?.context ?? []).map((entry) => (
              <div key={entry.label} className="min-w-0">
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{entry.label}</dt>
                <dd className="truncate text-sm text-foreground" title={entry.value}>
                  {entry.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </EditorModal>
  );
}
