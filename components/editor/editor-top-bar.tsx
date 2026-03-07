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
import { resolveProjectSourceFile } from "@/lib/project-source";
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
  const { undo, redo, canUndo, canRedo, historyTimeline, restoreHistoryNode, projectRepo, processor, dispatch } = useEditor();
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
      if (!loaded?.project) {
        toast.error(EDITOR_LABELS.topBar.openFailed);
        return;
      }
      const { project, fileBlob } = loaded;
      const file = await resolveProjectSourceFile({ project, fileBlob: fileBlob ?? null });
      if (!file) {
        toast.error(EDITOR_LABELS.topBar.openFailed);
        return;
      }
      if (!processor.isReady) await processor.initialize();
      const { decodeMedia } = await import("@/core/application/commands/editor-commands");
      const { frames, metadata } = await decodeMedia(processor, file);
      dispatch({
        type: "RESTORE_PROJECT",
        payload: {
          projectId: project.id,
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
        "relative z-20 shrink-0 border-b border-white/10",
        "animate-panel-in bg-black/40 backdrop-blur-xl transition-all duration-300",
        "flex h-auto flex-wrap items-center gap-2 px-3 py-2 sm:px-4",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Link
          href="/"
          aria-label={EDITOR_LABELS.topBar.logo}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 hover:border-white/20 hover:bg-white/5"
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
              className="min-w-0 max-w-[170px] rounded-lg border border-white/15 bg-black/40 px-2.5 py-1 text-sm font-medium tracking-[0.01em] text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 focus:border-primary/50 focus:ring-2 focus:ring-primary/40 sm:max-w-[240px]"
              autoFocus
            />
          ) : (
            <button
              onClick={startEdit}
              title={EDITOR_LABELS.topBar.rename}
              className="max-w-[170px] truncate rounded-lg px-2.5 py-1 text-sm font-semibold tracking-[0.01em] text-white/90 transition-all duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:max-w-[240px]"
            >
              {projectName}
            </button>
          )}
          <SaveIndicator status={saveStatus} />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg gap-1.5 px-2 text-xs font-medium text-white/70 transition-all duration-150 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-primary/50"
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
                className="h-8 rounded-lg gap-1.5 px-2 text-xs font-medium text-white/70 transition-all duration-150 hover:bg-white/10 hover:text-white"
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
                className="h-8 rounded-lg gap-1.5 px-2 text-xs font-medium text-white/70 transition-all duration-150 hover:bg-white/10 hover:text-white"
              >
                <Clock3 className="h-4 w-4" />
                <span className="hidden lg:inline">{EDITOR_LABELS.topBar.history}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {EDITOR_LABELS.topBar.historyTitle}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {historyTimeline.length <= 1 && (
                <DropdownMenuItem disabled>{EDITOR_LABELS.topBar.noHistory}</DropdownMenuItem>
              )}
              {historyTimeline.length > 1 && (
                <div className="max-h-[360px] overflow-y-auto px-3 py-2">
                  <div className="relative pl-6">
                    <div className="absolute left-[10px] top-1 bottom-1 w-px bg-white/10" />
                    <div className="space-y-3">
                      {historyTimeline.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => restoreHistoryNode(entry.id)}
                          title={`${entry.label} · ${new Date(entry.at).toLocaleTimeString()}`}
                          className={cn(
                            "group relative flex w-full items-start gap-3 rounded-xl px-1 py-0.5 text-left transition-colors duration-150",
                            entry.isCurrent ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "absolute left-0 top-2.5 h-5 w-5 rounded-full border transition-all duration-150",
                              entry.isCurrent
                                ? "border-primary/60 bg-primary shadow-[0_0_0_4px_rgba(91,140,255,0.16)]"
                                : "border-white/18 bg-[var(--surface-2)] group-hover:border-primary/40"
                            )}
                          />
                          <div className="min-w-0 pl-7">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-[12px] font-medium">
                                {entry.label}
                              </span>
                              {entry.isCurrent && (
                                <span className="rounded-full border border-primary/35 bg-primary/12 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                              {new Date(entry.at).toLocaleTimeString()}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-black/20 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-white/70 transition-all duration-150 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-primary/50"
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
            className="h-8 w-8 rounded-lg text-white/70 transition-all duration-150 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-primary/50"
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
