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
  Library,
  LayoutGrid,
  CalendarDays,
  ChevronDown,
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
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href="/"
          aria-label={EDITOR_LABELS.topBar.logo}
          className="group inline-flex shrink-0 items-center gap-2 rounded-[12px] border border-white/5 bg-white/[0.03] px-3 py-1.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_8px_rgba(0,0,0,0.2)] transition-all duration-300 hover:border-white/10 hover:bg-white-[0.05] active:scale-[0.98]"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-primary/20 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
             <Sparkles className="animate-float-idle h-3.5 w-3.5" />
          </div>
          <span className="text-[13px] font-semibold tracking-wide text-white/90 group-hover:text-white transition-colors">GifAlchemy</span>
        </Link>

        <div className="h-6 w-px shrink-0 bg-border/35" />

        <div className="flex items-center gap-1.5 rounded-full border border-white/[0.05] bg-white/[0.02] px-1.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-all duration-300">
          <div className="flex h-6 items-center gap-1 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
            Project
            <span className="text-white/10">/</span>
          </div>
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
              className="min-w-0 max-w-[170px] rounded-full border border-primary/50 bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-wide text-white outline-none shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)] transition-all duration-200 focus:bg-primary/20 sm:max-w-[240px]"
              autoFocus
            />
          ) : (
            <button
              onClick={startEdit}
              title={EDITOR_LABELS.topBar.rename}
              className="group relative max-w-[170px] truncate rounded-full px-4 py-1.5 text-xs font-bold tracking-wide text-white/90 transition-all duration-300 hover:bg-white/[0.08] hover:text-white sm:max-w-[300px]"
            >
              <span className="relative z-10">{projectName}</span>
              <div className="absolute inset-0 z-0 scale-x-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 transition-transform duration-500 group-hover:scale-x-100" />
            </button>
          )}
          <SaveIndicator status={saveStatus} />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-[12px] border border-white/5 bg-white/[0.02] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-all duration-300">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-[8px] gap-2 px-2.5 text-xs font-medium text-white/70 transition-all duration-200 hover:bg-white/[0.06] hover:text-white focus-visible:ring-1 focus-visible:ring-primary/40"
            onClick={openShortcuts}
          >
            <Keyboard className="h-4 w-4 text-white/50" />
            <span className="hidden lg:inline">{EDITOR_LABELS.shortcuts.button}</span>
          </Button>

          <div className="w-px h-4 bg-white/10 mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="group relative flex h-9 items-center gap-2.5 rounded-full border border-white/[0.05] bg-white/[0.03] px-4 text-[11px] font-black uppercase tracking-widest text-white/50 transition-all duration-500 hover:border-primary/30 hover:bg-primary/10 hover:text-white"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-white/[0.04] transition-all duration-300 group-hover:bg-primary/20 group-hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]">
                  <Library className="h-3.5 w-3.5 text-primary/40 group-hover:text-primary transition-colors" />
                </div>
                <span className="relative z-10">{EDITOR_LABELS.topBar.recent}</span>
                <ChevronDown className="h-3 w-3 text-white/20 transition-transform duration-500 group-data-[state=open]:rotate-180" />
                
                {/* Premium Shine Overlay */}
                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.03),transparent)]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-[320px] rounded-[24px] border-white/10 bg-[#07090d]/98 p-2 backdrop-blur-3xl shadow-[0_32px_80px_-16px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              <div className="px-3 pb-2 pt-3">
                <DropdownMenuLabel className="flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                  <LayoutGrid className="h-3 w-3" />
                  {EDITOR_LABELS.topBar.recentTitle}
                </DropdownMenuLabel>
              </div>
              <div className="mt-1 space-y-1">
                {loadingRecent ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3 opacity-40">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-[10px] uppercase font-black tracking-widest">{EDITOR_LABELS.topBar.loading}</span>
                  </div>
                ) : recentProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-2 opacity-30 text-center px-6">
                    <Library className="h-8 w-8 mb-2" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">{EDITOR_LABELS.topBar.noRecent}</span>
                    <p className="text-[9px] lowercase font-medium tracking-tight">Your recent masterpieces will appear here</p>
                  </div>
                ) : (
                  recentProjects.map((p) => (
                    <DropdownMenuItem 
                      key={p.id} 
                      onClick={() => openRecentProject(p.id)}
                      className="group/item relative flex cursor-pointer items-center gap-4 rounded-[16px] p-3 transition-all hover:bg-white/[0.04] focus:bg-white/[0.04]"
                    >
                      {/* Project Thumbnail Placeholder */}
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-white/[0.08] bg-black/40 shadow-inner group-hover/item:border-primary/40 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                        <span className="text-[10px] font-black text-white/10 group-hover/item:text-primary transition-colors">GIF</span>
                      </div>
                      
                      <div className="min-w-0 flex-1 flex flex-col gap-1">
                        <span className="truncate text-xs font-black tracking-tight text-white/90 group-hover/item:text-white transition-colors">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-40 group-hover/item:opacity-60 transition-opacity">
                          <CalendarDays className="h-3 w-3" />
                          <span className="text-[9px] font-bold uppercase tracking-tight">
                            {new Date(p.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            <span className="px-1 opacity-40">·</span>
                            {new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Active indicator arrow */}
                      <div className="opacity-0 -translate-x-2 transition-all duration-300 group-hover/item:opacity-100 group-hover/item:translate-x-0">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-[8px] gap-2 px-2.5 text-xs font-medium text-white/70 transition-all duration-200 hover:bg-white/[0.06] hover:text-white focus-visible:ring-1 focus-visible:ring-primary/40"
              >
                <Clock3 className="h-4 w-4 text-white/50" />
                <span className="hidden lg:inline">{EDITOR_LABELS.topBar.history}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[340px] border-white/10 bg-[#0a0a0a]/95 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] p-0">
              <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5">
                <DropdownMenuLabel className="p-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                  {EDITOR_LABELS.topBar.historyTitle}
                </DropdownMenuLabel>
              </div>
              {historyTimeline.length <= 1 && (
                <div className="px-4 py-6 text-center text-xs text-white/40">
                  {EDITOR_LABELS.topBar.noHistory}
                </div>
              )}
              {historyTimeline.length > 1 && (
                <div className="max-h-[380px] overflow-y-auto px-4 py-4 pb-6">
                  <div className="relative pl-8">
                    {/* Continuous vertical timeline track */}
                    <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent" />
                    
                    <div className="space-y-1 relative">
                      {historyTimeline.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => restoreHistoryNode(entry.id)}
                          title={`${entry.label} · ${new Date(entry.at).toLocaleTimeString()}`}
                          className={cn(
                            "group relative flex w-full items-center gap-4 rounded-[12px] px-3 py-2.5 text-left transition-all duration-300",
                            entry.isCurrent 
                              ? "bg-white/[0.06]" 
                              : "hover:bg-white/[0.04] active:scale-[0.98]"
                          )}
                        >
                          {/* Timeline node */}
                          <div className="absolute left-[-23px] top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full box-content transition-all duration-500",
                                entry.isCurrent
                                  ? "border-[3px] border-primary/30 bg-primary scale-150 shadow-[0_0_15px_rgba(91,140,255,0.8)]"
                                  : "border-[2px] border-white/20 bg-[#0f0f0f] group-hover:border-primary/50 group-hover:bg-white/10 group-hover:scale-125 group-hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                              )}
                            />
                          </div>
 
                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn(
                                "truncate text-[13px] font-medium transition-colors duration-300",
                                entry.isCurrent ? "text-white" : "text-white/70 group-hover:text-white/95"
                              )}>
                                {entry.label}
                              </span>
                              {entry.isCurrent && (
                                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                                  Current
                                </span>
                              )}
                            </div>
                            <span className="mt-0.5 block text-[10px] font-medium tracking-wide text-white/40 group-hover:text-white/60 transition-colors duration-300">
                              {new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
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

        <div className="flex items-center gap-1 rounded-[12px] border border-white/5 bg-white/[0.02] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-all duration-300">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-[8px] text-white/70 transition-all duration-200 hover:bg-white/[0.06] hover:text-white focus-visible:ring-1 focus-visible:ring-primary/40"
            disabled={!canUndo}
            onClick={undo}
            aria-label="Undo"
            title="Undo (Ctrl/Cmd+Z)"
          >
            <Undo2 className="h-4 w-4 text-white/50 group-hover:text-white transition-colors" />
          </Button>
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-[8px] text-white/70 transition-all duration-200 hover:bg-white/[0.06] hover:text-white focus-visible:ring-1 focus-visible:ring-primary/40"
            disabled={!canRedo}
            onClick={redo}
            aria-label="Redo"
            title="Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)"
          >
            <Redo2 className="h-4 w-4 text-white/50 group-hover:text-white transition-colors" />
          </Button>
        </div>

        <ExportButton />
      </div>
    </header>
  );
}
