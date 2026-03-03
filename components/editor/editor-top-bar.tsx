"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Undo2, Redo2, Sparkles, CheckCircle2, Loader2, AlertCircle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportButton } from "./export-button";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ProjectSummary } from "@/core/application/repositories/project-repository.port";

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
  const { undo, redo, canUndo, canRedo, projectRepo, processor, dispatch } = useEditor();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(projectName);
  const [recentProjects, setRecentProjects] = useState<ProjectSummary[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    if (!projectRepo) {
      setRecentProjects([]);
      return;
    }
    setLoadingRecent(true);
    projectRepo
      .list()
      .then((items) => {
        if (active) setRecentProjects(items.slice(0, 8));
      })
      .finally(() => {
        if (active) setLoadingRecent(false);
      });
    return () => {
      active = false;
    };
  }, [projectRepo]);

  const openRecentProject = async (id: string) => {
    if (!projectRepo || !processor) return;
    try {
      const loaded = await projectRepo.load(id);
      if (!loaded?.project || !loaded.fileBlob) {
        toast.error("Could not load this project file");
        return;
      }
      const { project, fileBlob } = loaded;
      const file = new File([fileBlob], project.sourceFile.name, { type: project.sourceFile.type });
      if (!processor.isReady) await processor.initialize();
      const { frames, metadata } = await processor.decode(file);
      dispatch({
        type: "RESTORE_PROJECT",
        payload: {
          file,
          frames,
          metadata,
          overlays: project.timeline.overlays,
          outputSettings: project.outputSettings,
          projectName: project.name,
          trimStart: project.trimStart ?? 0,
          trimEnd: project.trimEnd ?? Math.max(0, frames.length - 1),
          playbackRate: project.playbackRate ?? 1,
        },
      });
      toast.success(`Opened: ${project.name}`);
    } catch {
      toast.error("Failed to open project");
    }
  };

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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 rounded-lg gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" />
            Recent
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Recent projects</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {loadingRecent && <DropdownMenuItem disabled>Loading…</DropdownMenuItem>}
          {!loadingRecent && recentProjects.length === 0 && (
            <DropdownMenuItem disabled>No saved projects yet</DropdownMenuItem>
          )}
          {!loadingRecent &&
            recentProjects.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => openRecentProject(p.id)}>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(p.updatedAt).toLocaleString()}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          disabled={!canUndo}
          onClick={undo}
          aria-label="Undo"
          title="Undo (Ctrl/Cmd+Z)"
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
          title="Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Export */}
      <ExportButton />
    </header>
  );
}
