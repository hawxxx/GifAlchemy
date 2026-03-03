"use client";

import { useState, useEffect } from "react";
import { EditorProvider } from "@/providers/editor-provider";
import { EditorShell } from "@/components/editor/editor-shell";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import type { IGifProcessor } from "@/core/application/processors/gif-processor.port";
import type { IProjectRepository } from "@/core/application/repositories/project-repository.port";

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
    import("@/core/infrastructure/repositories/indexeddb-project-repo.adapter").then(({ createIndexedDbProjectRepo }) => {
      if (mounted) setProjectRepo(createIndexedDbProjectRepo());
    }).catch(() => {
      if (mounted) setProjectRepo(null);
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
