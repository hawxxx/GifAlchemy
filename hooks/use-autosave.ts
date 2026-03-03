"use client";

import { useEffect, useRef, useState } from "react";
import { createAutosaveService } from "@/core/application/services/autosave-service";
import type { Project } from "@/core/domain/project";
import { useEditor } from "./use-editor";

export interface AutosaveEvent {
  status: "saving" | "saved" | "error";
  at: number;
}

const MAX_AUTOSAVE_EVENTS = 20;

export function useAutosave() {
  const { state, projectRepo } = useEditor();
  const serviceRef = useRef<ReturnType<typeof createAutosaveService> | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [timeline, setTimeline] = useState<AutosaveEvent[]>([]);

  if (!serviceRef.current && projectRepo) {
    serviceRef.current = createAutosaveService(projectRepo);
  }
  const service = serviceRef.current;

  useEffect(() => {
    if (!service) return;
    const unsub = service.subscribe((s) => {
      setSaveStatus((prev) => {
        if (prev !== s.saveStatus && s.saveStatus !== "idle") {
          const nextEvent: AutosaveEvent = { status: s.saveStatus, at: Date.now() };
          setTimeline((current) => [...current, nextEvent].slice(-MAX_AUTOSAVE_EVENTS));
        }
        return s.saveStatus;
      });
      setLastSavedAt(s.lastSavedAt);
    });
    return unsub;
  }, [service]);

  const project: Project | null =
    state.file && state.metadata
      ? {
          id: `local-${state.file.name}-${state.file.lastModified}`,
          name: state.projectName,
          sourceFile: {
            name: state.file.name,
            size: state.file.size,
            type: state.file.type,
          },
          timeline: {
            duration: state.metadata.duration,
            frameCount: state.metadata.frameCount,
            overlays: state.overlays,
          },
          outputSettings: state.outputSettings,
          trimStart: state.trimStart,
          trimEnd: state.trimEnd,
          playbackRate: state.playbackRate,
          snapshots: state.snapshots,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
      : null;

  useEffect(() => {
    if (!service || !project) return;
    service.scheduleSave(project, state.file ?? null);
  }, [service, state.file, state.outputSettings, state.overlays, state.projectName, state.trimStart, state.trimEnd, state.playbackRate, state.snapshots, state.metadata?.frameCount]);

  const saveNow = project && service ? () => service.saveNow(project, state.file ?? null) : undefined;
  return { saveStatus, lastSavedAt, timeline, saveNow };
}
