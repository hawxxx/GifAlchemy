"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Undo2,
  Redo2,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  History,
  Clock3,
  Keyboard,
} from "lucide-react";
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
import { EDITOR_LABELS } from "@/lib/i18n/editor-labels";

export interface EditorTopBarProps {
  projectName: string;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onProjectNameChange?: (name: string) => void;
  className?: string;
}

function SaveIndicator({ status }: { status: EditorTopBarProps["saveStatus"] }) {
  if (status === "idle") return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border/45 bg-background/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors duration-150"
      aria-live="polite"
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {EDITOR_LABELS.save.saving}
        </>
      )}
      {status === "saved" && (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          {EDITOR_LABELS.save.saved}
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          {EDITOR_LABELS.save.error}
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
  const { undo, redo, canUndo, canRedo, undoHistory, redoHistory, projectRepo, processor, dispatch } = useEditor();
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
        toast.error(EDITOR_LABELS.topBar.openFailed);
        return;
      }
      const { project, fileBlob } = loaded;
      const idSuffixMatch = /-(\d+)$/.exec(project.id);
      const inferredLastModified = idSuffixMatch ? Number(idSuffixMatch[1]) : Date.now();
      const file = new File([fileBlob], project.sourceFile.name, {
        type: project.sourceFile.type,
        lastModified: Number.isFinite(inferredLastModified)
          ? inferredLastModified
          : Date.now(),
      });
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
      const url = new URL(window.location.href);
      url.searchParams.set("project", project.id);
      url.searchParams.delete("intent");
      window.history.replaceState({}, "", url.toString());
      toast.success(`${EDITOR_LABELS.topBar.openedToast} ${project.name}`);
    } catch {
      toast.error(EDITOR_LABELS.topBar.openError);
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

  const openShortcuts = () => {
    window.dispatchEvent(new CustomEvent("gifalchemy:open-shortcuts"));
  };

  return (
    <header
      className={cn(
        "relative z-20 shrink-0 border-b border-[var(--border-subtle)]",
        "animate-panel-in bg-[var(--surface-1)]/95 backdrop-blur-sm transition-colors duration-[var(--duration-ui)]",
        "flex h-auto flex-wrap items-center gap-2 px-3 py-2 sm:px-4",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Link
          href="/"
          aria-label={EDITOR_LABELS.topBar.logo}
          className="surface-sheen inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/45 bg-background/75 px-2.5 py-1.5 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:border-border/60 hover:bg-background/90"
        >
          <Sparkles className="animate-float-idle h-4 w-4 text-primary/85" />
          <span className="text-[13px] font-semibold tracking-[0.02em]">GifAlchemy</span>
        </Link>

        <div className="h-6 w-px shrink-0 bg-border/35" />

        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-transparent px-0.5 py-0.5">
          {editing ? (
            <input
              ref={inputRef}
              value={draftName}
              aria-label={EDITOR_LABELS.topBar.renameInput}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="min-w-0 max-w-[170px] rounded-lg border border-border/50 bg-background/70 px-2.5 py-1 text-sm font-medium tracking-[0.01em] text-foreground outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 focus:border-border/70 focus:ring-2 focus:ring-ring/35 sm:max-w-[240px]"
              autoFocus
            />
          ) : (
            <button
              onClick={startEdit}
              title={EDITOR_LABELS.topBar.rename}
              className="max-w-[170px] truncate rounded-lg px-2.5 py-1 text-sm font-semibold tracking-[0.01em] text-foreground/95 transition-all duration-150 hover:bg-background/65 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 sm:max-w-[240px]"
            >
              {projectName}
            </button>
          )}
          <SaveIndicator status={saveStatus} />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="surface-sheen flex items-center gap-1 rounded-xl border border-border/45 bg-background/62 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-colors duration-200">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg gap-1.5 px-2 text-xs font-medium text-muted-foreground transition-all duration-150 hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
            onClick={openShortcuts}
          >
            <Keyboard className="h-4 w-4" />
            <span className="hidden lg:inline">{EDITOR_LABELS.shortcuts.button}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg gap-1.5 px-2 text-xs font-medium text-muted-foreground transition-all duration-150 hover:bg-background/70 hover:text-foreground"
              >
                <History className="h-4 w-4" />
                <span className="hidden lg:inline">{EDITOR_LABELS.topBar.recent}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {EDITOR_LABELS.topBar.recentTitle}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {loadingRecent && (
                <DropdownMenuItem disabled>{EDITOR_LABELS.topBar.loading}</DropdownMenuItem>
              )}
              {!loadingRecent && recentProjects.length === 0 && (
                <DropdownMenuItem disabled>{EDITOR_LABELS.topBar.noRecent}</DropdownMenuItem>
              )}
              {!loadingRecent &&
                recentProjects.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => openRecentProject(p.id)}>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{p.name}</span>
                      <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                        {new Date(p.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg gap-1.5 px-2 text-xs font-medium text-muted-foreground transition-all duration-150 hover:bg-background/70 hover:text-foreground"
              >
                <Clock3 className="h-4 w-4" />
                <span className="hidden lg:inline">{EDITOR_LABELS.topBar.history}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {EDITOR_LABELS.topBar.historyTitle}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {undoHistory.length === 0 && redoHistory.length === 0 && (
                <DropdownMenuItem disabled>{EDITOR_LABELS.topBar.noHistory}</DropdownMenuItem>
              )}
              {undoHistory.slice(-8).reverse().map((entry, idx) => (
                <DropdownMenuItem key={`undo-${entry.id}-${idx}`} disabled className="opacity-80">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">Undo: {entry.label}</span>
                    <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      {new Date(entry.at).toLocaleTimeString()}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
              {redoHistory.length > 0 && <DropdownMenuSeparator />}
              {redoHistory.slice(0, 8).map((entry, idx) => (
                <DropdownMenuItem key={`redo-${entry.id}-${idx}`} disabled className="opacity-70">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">Redo: {entry.label}</span>
                    <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      {new Date(entry.at).toLocaleTimeString()}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-0.5 rounded-xl border border-border/45 bg-background/62 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-colors duration-200">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground transition-all duration-150 hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
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
            className="h-8 w-8 rounded-lg text-muted-foreground transition-all duration-150 hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
            disabled={!canRedo}
            onClick={redo}
            aria-label="Redo"
            title="Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <ExportButton />
      </div>
    </header>
  );
}
