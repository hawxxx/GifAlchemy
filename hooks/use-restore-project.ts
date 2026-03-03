"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "./use-editor";

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
        const list = await projectRepo.list();
        if (cancelled || list.length === 0) return;

        const latest = list[0];
        const loaded = await projectRepo.load(latest.id);
        if (cancelled || !loaded?.project || !loaded.fileBlob) return;

        const { project, fileBlob } = loaded;
        const file = new File([fileBlob], project.sourceFile.name, {
          type: project.sourceFile.type,
        });

        if (!processor.isReady) await processor.initialize();
        if (cancelled) return;

        const { frames, metadata } = await processor.decode(file);
        if (cancelled) return;

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
