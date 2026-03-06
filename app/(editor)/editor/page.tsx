"use client";

import { useState, useEffect } from "react";
import { EditorProvider } from "@/providers/editor-provider";
import { EditorShell } from "@/components/editor/editor-shell";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import type { IGifProcessor } from "@/core/application/processors/gif-processor.port";
import type { IProjectRepository } from "@/core/application/repositories/project-repository.port";
import type { Project } from "@/core/domain/project";

function createFallbackProjectRepo(
  idb: IProjectRepository,
  ls: IProjectRepository
): IProjectRepository {
  let useIdb = true;
  async function withFallback<T>(
    idbFn: () => Promise<T>,
    lsFn: () => Promise<T>
  ): Promise<T> {
    if (useIdb) {
      try {
        return await idbFn();
      } catch {
        useIdb = false;
        return lsFn();
      }
    }
    return lsFn();
  }
  return {
    save: (project: Project, fileBlob?: ArrayBuffer) =>
      withFallback(() => idb.save(project, fileBlob), () => ls.save(project, fileBlob)),
    load: (id: string) =>
      withFallback(() => idb.load(id), () => ls.load(id)),
    list: () =>
      withFallback(() => idb.list(), () => ls.list()),
    delete: (id: string) =>
      withFallback(() => idb.delete(id), () => ls.delete(id)),
  };
}

export default function EditorPage() {
  const [processor, setProcessor] = useState<IGifProcessor | null>(null);
  const [projectRepo, setProjectRepo] = useState<IProjectRepository | null>(null);

  useEffect(() => {
    let mounted = true;
    import("@/core/infrastructure/processors/wasm-gif-processor.adapter").then(({ WasmGifProcessorAdapter }) => {
      if (mounted) setProcessor(new WasmGifProcessorAdapter());
    }).catch(() => {
      if (mounted) setProcessor(null);
    });
    Promise.all([
      import("@/core/infrastructure/repositories/indexeddb-project-repo.adapter").then((m) => m.createIndexedDbProjectRepo()),
      import("@/core/infrastructure/repositories/local-storage-project-repo.adapter").then((m) => m.createLocalStorageProjectRepo()),
    ])
      .then(([idbRepo, lsRepo]) => {
        if (!mounted) return;
        setProjectRepo(createFallbackProjectRepo(idbRepo, lsRepo));
      })
      .catch(() => {
        import("@/core/infrastructure/repositories/local-storage-project-repo.adapter").then(({ createLocalStorageProjectRepo }) => {
          if (mounted) setProjectRepo(createLocalStorageProjectRepo());
        }).catch(() => {
          if (mounted) setProjectRepo(null);
        });
      });
    return () => { mounted = false; };
  }, []);

  return (
    <ErrorBoundary>
      <EditorProvider processor={processor} projectRepo={projectRepo}>
        <EditorShell />
      </EditorProvider>
    </ErrorBoundary>
  );
}
