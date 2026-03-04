"use client";

import { useCallback, useRef, useState } from "react";
import { Trash2, Copy, Eye, EyeOff, Lock, Unlock, ImageIcon, Upload } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useOverlays } from "@/hooks/use-overlays";
import { useEditor } from "@/hooks/use-editor";
import type { Overlay } from "@/core/domain/project";
import { cn } from "@/lib/utils";

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
  const { state, dispatch } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const imageOverlays = overlays.filter((o) => o.type === "image");
  const selectedOverlay = imageOverlays.find((o) => o.id === selectedOverlayId) ?? null;

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.type.match(/^image\/(png|webp|jpeg|jpg)/)) return;
      const dataUrl = await readFileAsDataUrl(file);
      const { width, height } = await getImageDimensions(dataUrl);
      const frameCount = state.frames.length;
      const id = `ol_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const overlay: Overlay = {
        id,
        type: "image",
        content: file.name,
        imageDataUrl: dataUrl,
        imageWidth: width,
        imageHeight: height,
        fontFamily: "system-ui",
        fontSize: 32,
        fontWeight: "normal",
        fontStyle: "normal",
        textAlign: "center",
        color: "#ffffff",
        strokeWidth: 0,
        strokeColor: "#000000",
        keyframes: [
          { frameIndex: 0, x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 1 },
          { frameIndex: Math.max(0, frameCount - 1), x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 1 },
        ],
        effects: [],
        inFrame: 0,
        outFrame: Math.max(0, frameCount - 1),
        visible: true,
        locked: false,
      };
      dispatch({ type: "ADD_OVERLAY", payload: overlay });
      dispatch({ type: "SET_TOOL", payload: "image" });
    },
    [dispatch, state.frames.length]
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
    </div>
  );
}
