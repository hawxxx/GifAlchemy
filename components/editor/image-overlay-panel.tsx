"use client";

import { useCallback } from "react";
import { Trash2, Copy, Eye, EyeOff, Lock, Unlock, ImageIcon, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useOverlays } from "@/hooks/use-overlays";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/lib/utils";

export function ImageOverlayPanel() {
  const { overlays, selectedOverlayId, removeOverlay, duplicateOverlay, updateOverlay, selectOverlay } =
    useOverlays();
  const { dispatch } = useEditor();

  const imageOverlays = overlays.filter((o) => o.type === "image");
  const selectedOverlay = imageOverlays.find((o) => o.id === selectedOverlayId) ?? null;

  const openImageAssets = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gifalchemy:open-image-assets"));
    }
  }, []);

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
      {selectedOverlay && !selectedOverlay.imageDataUrl && (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4"
          role="alert"
        >
          <p className="text-xs font-medium text-amber-200/90 text-center">
            Image missing (e.g. after refresh)
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-amber-500/20 text-amber-200 hover:bg-amber-500/10 transition-colors"
            onClick={openImageAssets}
          >
            <Images className="mr-1.5 h-3.5 w-3.5" />
            Open image assets
          </Button>
        </div>
      )}

      {selectedOverlay && (
        <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-black/10 p-3">
          <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
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
            <span className="w-8 text-right text-xs font-medium tabular-nums text-muted-foreground">
              {Math.round(selectedOpacity * 100)}%
            </span>
          </div>
        </div>
      )}

      {imageOverlays.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/90">
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
                    ? "border-primary/30 bg-primary/10"
                    : "border-white/5 hover:border-white/10 hover:bg-white/5"
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
                    className="h-8 w-8 rounded object-cover shrink-0 border border-white/10"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/10 bg-black/20">
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
        <div className="rounded-xl border border-border/55 bg-gradient-to-b from-background/70 to-background/45 px-3 py-3 text-center">
          <p className="text-xs text-muted-foreground/78">
            No image overlays yet. Open the Image submenu from the left rail to drag assets into the canvas.
          </p>
        </div>
      )}
    </div>
  );
}
