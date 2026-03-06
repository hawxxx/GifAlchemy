"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "./use-editor";
import { resolveProjectSourceFile } from "@/lib/project-source";

/**
 * On editor load, if the editor is empty and we have a saved project (with file blob),
 * restore the most recent project so refresh or "continue later" works.
 */
export function useRestoreProject() {
  const { state, dispatch, processor, projectRepo } = useEditor();
  const attemptedRestore = useRef(false);

  useEffect(() => {
    if (
      attemptedRestore.current ||
      !projectRepo ||
      !processor ||
      state.status !== "empty" ||
      state.frames.length > 0
    ) {
      return;
    }

    let cancelled = false;
    attemptedRestore.current = true;

    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const intent = params.get("intent");
        if (intent === "new") return;

        const explicitProjectId = params.get("project");
        let targetId =
          explicitProjectId ||
          (await projectRepo.list().then((list) => (list.length > 0 ? list[0].id : null)));
        if (cancelled || !targetId) return;

        let loaded = await projectRepo.load(targetId);
        if (cancelled) return;
        if (!loaded?.project || !loaded.fileBlob) {
          const list = await projectRepo.list();
          const fallbackId = list.length > 0 ? list[0].id : null;
          if (fallbackId && fallbackId !== targetId) {
            loaded = await projectRepo.load(fallbackId);
            if (loaded?.project) {
              targetId = fallbackId;
              const url = new URL(window.location.href);
              url.searchParams.set("project", fallbackId);
              window.history.replaceState({}, "", url.toString());
            }
          }
        }
        if (cancelled || !loaded?.project) {
          attemptedRestore.current = false;
          dispatch({ type: "RESET" });
          return;
        }

        const { project, fileBlob } = loaded;
        const file = await resolveProjectSourceFile({ project, fileBlob });
        if (cancelled || !file) return;

        const url = new URL(window.location.href);
        url.searchParams.set("project", project.id);
        url.searchParams.delete("intent");
        window.history.replaceState({}, "", url.toString());

        if (!processor.isReady) await processor.initialize();
        if (cancelled) return;

        const { frames, metadata } = await processor.decode(file);
        if (cancelled) return;

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
            snapshots: project.snapshots ?? [],
          },
        });
      } catch {
        attemptedRestore.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.status, state.frames.length, projectRepo, processor, dispatch]);
}
