"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Undo2, Redo2, Sparkles, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportButton } from "./export-button";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/lib/utils";

export interface EditorTopBarProps {
  projectName: string;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onProjectNameChange?: (name: string) => void;
  className?: string;
}

function SaveIndicator({ status }: { status: EditorTopBarProps["saveStatus"] }) {
  if (status === "idle") return null;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving…
        </>
      )}
      {status === "saved" && (
        <>
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Saved
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3 w-3 text-destructive" />
          Save failed
        </>
      )}
    </span>
  );
}

export function EditorTopBar({
  projectName,
  saveStatus,
  onProjectNameChange,
  className,
}: EditorTopBarProps) {
  const { undo, redo, canUndo, canRedo } = useEditor();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraftName(projectName);
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const commitEdit = () => {
    setEditing(false);
    const trimmed = draftName.trim() || "Untitled";
    onProjectNameChange?.(trimmed);
  };

  return (
    <header
      className={cn(
        "flex items-center gap-4 px-4 h-12 border-b border-border/50 bg-background/95 backdrop-blur-sm shrink-0",
        className
      )}
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-1.5 text-foreground hover:opacity-80 transition-opacity shrink-0"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-base font-semibold tracking-tight">GifAlchemy</span>
      </Link>

      <div className="w-px h-5 bg-border/60 shrink-0" />

      {/* Project name — editable */}
      {editing ? (
        <input
          ref={inputRef}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="text-sm font-medium bg-muted/50 rounded-lg px-2 py-0.5 border border-border outline-none focus:ring-2 focus:ring-ring/40 min-w-0 max-w-[220px]"
          autoFocus
        />
      ) : (
        <button
          onClick={startEdit}
          title="Click to rename"
          className="text-sm font-medium text-foreground truncate max-w-[220px] hover:bg-muted/40 rounded-lg px-2 py-0.5 transition-colors"
        >
          {projectName}
        </button>
      )}

      <SaveIndicator status={saveStatus} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          disabled={!canUndo}
          onClick={undo}
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          disabled={!canRedo}
          onClick={redo}
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Export */}
      <ExportButton />
    </header>
  );
}
