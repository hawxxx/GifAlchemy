"use client";

import { useEffect } from "react";
import { useEditor } from "@/hooks/use-editor";
import type { Project } from "@/components/projects/project-card";

const PROJECTS_KEY = "gifalchemy:projects";

function getStoredProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    return [];
  }
}

function upsertProject(project: Project) {
  const all = getStoredProjects();
  const updated = [project, ...all.filter((p) => p.id !== project.id)].slice(0, 50);
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
  } catch {
    // quota exceeded or private browsing — silently ignore
  }
}

function capturePreviewDataUrl(frame: { imageData: ImageData } | undefined): string | undefined {
  if (!frame) return undefined;
  try {
    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = frame.imageData.width;
    srcCanvas.height = frame.imageData.height;
    srcCanvas.getContext("2d")?.putImageData(frame.imageData, 0, 0);

    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = Math.min(frame.imageData.width, 200);
    thumbCanvas.height = Math.min(frame.imageData.height, 150);
    const ctx = thumbCanvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(srcCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    return thumbCanvas.toDataURL("image/webp", 0.6);
  } catch {
    return undefined;
  }
}

export function useProjectPersistence() {
  const { state } = useEditor();

  useEffect(() => {
    if (state.status !== "ready" || state.frames.length === 0) return;
    if (!state.file) return;

    const projectId = state.projectId || `local-${state.file.name}-${state.file.lastModified}`;
    const previewDataUrl = capturePreviewDataUrl(state.frames[0]);

    upsertProject({
      id: projectId,
      name: state.projectName || "Untitled",
      updatedAt: Date.now(),
      previewDataUrl,
    });
  // Re-run when meaningful project state changes (not on every frame render).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.file, state.projectId, state.projectName, state.frames.length]);
}
