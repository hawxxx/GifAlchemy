"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderOpen, ImageIcon, RefreshCcw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssetLibrary } from "@/hooks/use-asset-library";
import { useEditor } from "@/hooks/use-editor";
import { formatBytes } from "@/lib/utils";

interface ProjectCardMeta {
  id: string;
  name: string;
  updatedAt: number;
  previewDataUrl?: string;
}

const PROJECTS_KEY = "gifalchemy:projects";

function readStoredProjects(): ProjectCardMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function AssetLibraryPanel() {
  const { assets, loading } = useAssetLibrary();
  const { processor, projectRepo, dispatch } = useEditor();
  const [projects, setProjects] = useState<ProjectCardMeta[]>([]);

  useEffect(() => {
    setProjects(readStoredProjects());
  }, []);

  const sourceAssets = useMemo(
    () => assets.filter((asset) => asset.kind === "source").slice(0, 8),
    [assets]
  );

  const openProject = async (id: string) => {
    if (!projectRepo || !processor) return;
    const loaded = await projectRepo.load(id);
    if (!loaded?.project || !loaded.fileBlob) return;
    const { project, fileBlob } = loaded;
    const file = new File([fileBlob], project.sourceFile.name, {
      type: project.sourceFile.type,
      lastModified: project.updatedAt,
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
        snapshots: project.snapshots ?? [],
      },
    });
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("project", project.id);
      url.searchParams.delete("intent");
      window.history.replaceState({}, "", url.toString());
    }
  };

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-border/60 bg-background/60 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Uploaded assets
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Drag onto the canvas to reuse source media.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-7 rounded-md px-2 text-[11px]">
            <RefreshCcw className="h-3.5 w-3.5" />
            {loading ? "Loading" : assets.length}
          </Button>
        </div>
        {sourceAssets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-[12px] text-muted-foreground">
            Upload GIF, WebM, MP4, or PNG assets to keep them available after refresh.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {sourceAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/x-gifalchemy-asset-id", asset.id);
                  event.dataTransfer.effectAllowed = "copy";
                }}
                className="group overflow-hidden rounded-lg border border-border/60 bg-card/70 text-left transition-colors hover:border-primary/35 hover:bg-card"
                title="Drag onto canvas"
              >
                <div className="relative flex h-20 items-center justify-center overflow-hidden bg-muted/30">
                  {asset.previewDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.previewDataUrl} alt={asset.name} className="h-full w-full object-cover" />
                  ) : asset.type.startsWith("video/") ? (
                    <Video className="h-6 w-6 text-muted-foreground/60" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
                  )}
                </div>
                <div className="space-y-1 px-2 py-2">
                  <p className="truncate text-[11px] font-medium text-foreground">{asset.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatBytes(asset.size)}{asset.width && asset.height ? ` · ${asset.width}x${asset.height}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border/60 bg-background/60 p-3">
        <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Saved projects
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Continue editing from persistent saves.
          </p>
        </div>
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-[12px] text-muted-foreground">
            No saved projects yet.
          </div>
        ) : (
          <div className="space-y-2">
            {projects.slice(0, 6).map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => void openProject(project.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card/70 px-2.5 py-2 text-left transition-colors hover:border-primary/35 hover:bg-card"
              >
                <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/40">
                  {project.previewDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={project.previewDataUrl} alt={project.name} className="h-full w-full object-cover" />
                  ) : (
                    <FolderOpen className="h-4 w-4 text-muted-foreground/60" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-foreground">{project.name}</p>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    {new Date(project.updatedAt).toLocaleString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
