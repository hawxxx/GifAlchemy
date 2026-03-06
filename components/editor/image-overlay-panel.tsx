"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, Copy, Eye, EyeOff, Lock, Unlock, ImageIcon, Upload, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useOverlays } from "@/hooks/use-overlays";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/lib/utils";
import { resolveProjectSourceFile } from "@/lib/project-source";
import { createImageOverlay } from "@/core/application/commands/overlay-commands";
import { getAssetFile, listAssets, saveAsset, type StoredAsset } from "@/lib/asset-library";
import { toast } from "sonner";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

export function ImageOverlayPanel() {
  const { overlays, selectedOverlayId, removeOverlay, duplicateOverlay, updateOverlay, selectOverlay } =
    useOverlays();
  const { state, dispatch, processor, projectRepo } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [storedAssets, setStoredAssets] = useState<StoredAsset[]>([]);
  const [recentProjects, setRecentProjects] = useState<Array<{ id: string; name: string; updatedAt: number; previewDataUrl?: string }>>([]);

  useEffect(() => {
    let active = true;
    void listAssets(24)
      .then((assets) => {
        if (active) setStoredAssets(assets);
      })
      .catch(() => {
        if (active) setStoredAssets([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("gifalchemy:projects");
      const parsed = raw ? JSON.parse(raw) : [];
      setRecentProjects(Array.isArray(parsed) ? parsed.slice(0, 6) : []);
    } catch {
      setRecentProjects([]);
    }
  }, []);

  const imageOverlays = overlays.filter((o) => o.type === "image");
  const selectedOverlay = imageOverlays.find((o) => o.id === selectedOverlayId) ?? null;

  const createOverlayFromFile = useCallback(
    async (file: File) => {
      const dataUrl = await readFileAsDataUrl(file);
      const { width, height } = await getImageDimensions(dataUrl);

      const replaceTarget = selectedOverlay?.type === "image" && !selectedOverlay.imageDataUrl ? selectedOverlay : null;
      if (replaceTarget) {
        updateOverlay(replaceTarget.id, {
          content: file.name,
          imageDataUrl: dataUrl,
          imageWidth: width,
          imageHeight: height,
        });
        return;
      }

      const overlay = createImageOverlay(state.frames.length, {
        content: file.name,
        imageDataUrl: dataUrl,
        imageWidth: width,
        imageHeight: height,
      });
      dispatch({ type: "ADD_OVERLAY", payload: overlay });
      dispatch({ type: "SET_TOOL", payload: "image" });

      const asset = await saveAsset({
        file,
        previewDataUrl: dataUrl,
      }).catch(() => null);
      if (asset) {
        setStoredAssets((prev) => [asset, ...prev.filter((item) => item.id !== asset.id)].slice(0, 24));
      }
    },
    [dispatch, selectedOverlay, state.frames.length, updateOverlay]
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.type.match(/^image\/(png|webp|jpeg|jpg)/)) return;
      await createOverlayFromFile(file);
    },
    [createOverlayFromFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => setIsDraggingOver(false);

  const selectedOpacity =
    selectedOverlay
      ? (selectedOverlay.keyframes[0]?.opacity ?? 1)
      : 1;

  const handleOpacityChange = (value: number[]) => {
    if (!selectedOverlayId) return;
    const overlay = overlays.find((o) => o.id === selectedOverlayId);
    if (!overlay) return;
    const keyframes = overlay.keyframes.map((k) => ({ ...k, opacity: value[0] }));
    updateOverlay(selectedOverlayId, { keyframes });
  };

  const handleOpenProject = useCallback(async (id: string) => {
    if (!projectRepo || !processor) return;
    try {
      const loaded = await projectRepo.load(id);
      if (!loaded?.project) {
        toast.error("Project source file is missing.");
        return;
      }
      const { project, fileBlob } = loaded;
      const file = await resolveProjectSourceFile({ project, fileBlob });
      if (!file) {
        toast.error("Project source file is missing.");
        return;
      }
      if (!processor.isReady) await processor.initialize();
      const { frames, metadata } = await processor.decode(file);
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
      const url = new URL(window.location.href);
      url.searchParams.set("project", project.id);
      url.searchParams.delete("intent");
      window.history.replaceState({}, "", url.toString());
      toast.success(`Opened ${project.name}`);
    } catch {
      toast.error("Could not open that saved project.");
    }
  }, [dispatch, processor, projectRepo]);

  return (
    <div className="flex flex-col gap-3">
      {/* Upload drop zone */}
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 transition-colors cursor-pointer",
          isDraggingOver
            ? "border-primary/80 bg-primary/5"
            : "border-border/60 hover:border-border hover:bg-muted/20"
        )}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        aria-label="Upload image overlay"
      >
        <Upload className="h-5 w-5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground text-center">
          Drop PNG / WebP / JPG here
          <br />
          or <span className="text-primary underline underline-offset-2">click to browse</span>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/webp,image/jpeg"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Missing image — re-upload for selected overlay */}
      {selectedOverlay && !selectedOverlay.imageDataUrl && (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 p-4"
          role="alert"
        >
          <p className="text-xs font-medium text-amber-200/90 text-center">
            Image missing (e.g. after refresh)
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-amber-500/40 text-amber-200 hover:bg-amber-500/20"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Re-upload image
          </Button>
        </div>
      )}

      {/* Opacity control for selected image overlay */}
      {selectedOverlay && (
        <div className="flex flex-col gap-2 rounded-xl border border-border/55 bg-gradient-to-b from-background/70 to-background/45 p-3 shadow-[inset_0_1px_0_0_theme(colors.background/70)]">
          <Label className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/80">
            Opacity
          </Label>
          <div className="flex items-center gap-3">
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[selectedOpacity]}
              onValueChange={handleOpacityChange}
              aria-label="Image opacity"
              className="flex-1"
            />
            <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
              {Math.round(selectedOpacity * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Image overlay list */}
      {imageOverlays.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/80">
            Image layers
          </p>
          {imageOverlays.map((overlay) => {
            const isSelected = selectedOverlayId === overlay.id;
            return (
              <div
                key={overlay.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg border px-2 py-1.5 cursor-pointer transition-colors",
                  isSelected
                    ? "border-primary/40 bg-primary/8"
                    : "border-border/50 hover:border-border/80 hover:bg-muted/20"
                )}
                onClick={() => {
                  selectOverlay(overlay.id);
                  dispatch({ type: "SET_TOOL", payload: "image" });
                }}
              >
                {overlay.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={overlay.imageDataUrl}
                    alt={overlay.content}
                    className="h-8 w-8 rounded object-cover shrink-0 border border-border/40"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border/40 bg-muted/30">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <span className="flex-1 truncate text-xs text-foreground/90" title={overlay.content}>
                  {overlay.content || "Image"}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    aria-label={overlay.visible === false ? "Show layer" : "Hide layer"}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOverlay(overlay.id, { visible: overlay.visible === false ? true : false });
                    }}
                  >
                    {overlay.visible === false ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={overlay.locked ? "Unlock layer" : "Lock layer"}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOverlay(overlay.id, { locked: !overlay.locked });
                    }}
                  >
                    {overlay.locked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Duplicate layer"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateOverlay(overlay.id);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete layer"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOverlay(overlay.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {imageOverlays.length === 0 && (
        <p className="text-center text-xs text-muted-foreground/70 py-1">
          No image overlays yet. Upload one above.
        </p>
      )}

      <div className="flex flex-col gap-2 rounded-xl border border-border/55 bg-gradient-to-b from-background/70 to-background/45 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/80">
              Uploaded assets
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              Drag onto the canvas or click to add as an image overlay.
            </p>
          </div>
          <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
            {storedAssets.length}
          </span>
        </div>
        {storedAssets.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {storedAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-gifalchemy-image-asset-id", asset.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => {
                  void getAssetFile(asset.id).then((file) => {
                    if (file) return createOverlayFromFile(file);
                  });
                }}
                className="group flex flex-col overflow-hidden rounded-lg border border-border/55 bg-background/55 text-left transition-all duration-150 hover:border-primary/35 hover:bg-background/80"
              >
                <div className="flex h-20 items-center justify-center overflow-hidden bg-[repeating-conic-gradient(#191c21_0%_25%,#232730_0%_50%)_50%_/_12px_12px]">
                  {asset.previewDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.previewDataUrl} alt={asset.name} className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground/55" />
                  )}
                </div>
                <div className="space-y-0.5 px-2 py-1.5">
                  <p className="truncate text-[11px] font-medium text-foreground/92">{asset.name}</p>
                  <p className="text-[10px] text-muted-foreground/75">
                    {asset.width && asset.height ? `${asset.width}x${asset.height}` : "Asset"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/70">Uploaded assets will appear here and persist after refresh.</p>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border/55 bg-gradient-to-b from-background/70 to-background/45 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/80">
              Saved projects
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              Jump back into recent work without leaving the editor.
            </p>
          </div>
          <FolderOpen className="h-4 w-4 text-muted-foreground/60" />
        </div>
        {recentProjects.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {recentProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => void handleOpenProject(project.id)}
                className="group flex flex-col overflow-hidden rounded-lg border border-border/55 bg-background/55 text-left transition-all duration-150 hover:border-primary/35 hover:bg-background/80"
              >
                <div className="flex h-20 items-center justify-center overflow-hidden bg-[linear-gradient(180deg,rgba(18,22,28,0.92),rgba(9,12,16,0.98))]">
                  {project.previewDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={project.previewDataUrl} alt={project.name} className="h-full w-full object-cover" />
                  ) : (
                    <FolderOpen className="h-5 w-5 text-muted-foreground/55" />
                  )}
                </div>
                <div className="space-y-0.5 px-2 py-1.5">
                  <p className="truncate text-[11px] font-medium text-foreground/92">{project.name}</p>
                  <p className="text-[10px] text-muted-foreground/75">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/70">Saved projects show up here after the first autosave.</p>
        )}
      </div>
    </div>
  );
}
