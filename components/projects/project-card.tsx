"use client";

import React, { useState, useRef } from "react";
import { MoreHorizontal, FolderOpen, Pencil, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Project {
  id: string;
  name: string;
  updatedAt: number;
  previewDataUrl?: string;
}

interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: diffDays > 365 ? "numeric" : undefined });
}

export function ProjectCard({ project, onOpen, onDelete, onRename }: ProjectCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleRenameStart() {
    setEditName(project.name);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  }

  function handleRenameCommit() {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== project.name) {
      onRename(trimmed);
    } else {
      setEditName(project.name);
    }
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleRenameCommit();
    if (e.key === "Escape") {
      setEditName(project.name);
      setIsEditing(false);
    }
  }

  return (
    <div
      className="group relative flex flex-col rounded-xl border border-border/40 bg-card overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 active:scale-[0.98]"
      onClick={() => !isEditing && onOpen()}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-muted/50 to-muted rounded-t-xl">
        {project.previewDataUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.previewDataUrl}
              alt={project.name}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-0"
            />
            {project.previewDataUrl.startsWith("data:video/") && (
              <video
                src={project.previewDataUrl}
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                loop
                muted
                playsInline
                ref={(el) => {
                  if (el) {
                    el.onmouseenter = () => el.play().catch(() => {});
                    el.onmouseleave = () => {
                      el.pause();
                      el.currentTime = 0;
                    };
                  }
                }}
              />
            )}
            {/* Fallback for non-video animated images (e.g. GIFs) - just show them scaling slightly if they can't be autoplayed distinctly */}
            {!project.previewDataUrl.startsWith("data:video/") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.previewDataUrl}
                alt={project.name}
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div
            className="h-full w-full opacity-60 transition-transform duration-700 group-hover:scale-110"
            style={{
              backgroundImage:
                "repeating-conic-gradient(oklch(0.22 0 0) 0% 25%, oklch(0.17 0 0) 0% 50%)",
              backgroundSize: "14px 14px",
            }}
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 text-xs font-medium text-white shadow-sm shadow-black/50 bg-black/60 rounded-lg px-3 py-1.5 backdrop-blur-md">
            Open Editor
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRenameCommit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-md bg-input border border-ring px-1.5 py-0.5 text-sm font-medium text-foreground outline-none"
              autoFocus
            />
          ) : (
            <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(project.updatedAt)}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-foreground transition-all duration-150"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onOpen}>
              <FolderOpen className="h-4 w-4" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRenameStart}>
              <Pencil className="h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
