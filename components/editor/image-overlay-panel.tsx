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
    <div className="flex flex-col gap-4">
      {selectedOverlay && !selectedOverlay.imageDataUrl && (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-amber-500/30 bg-[rgba(245,158,11,0.06)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm"
            role="alert"
          >
            <p className="text-[10px] font-bold text-amber-500/90 text-center uppercase tracking-widest">
              Missing Source
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-3 rounded text-[10px] font-bold tracking-wider uppercase border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all duration-150 active:scale-95"
              onClick={openImageAssets}
            >
              <Images className="mr-1.5 h-3 w-3" />
              Open Assets
            </Button>
          </div>
      )}

      {selectedOverlay && (
        <div className="flex flex-col gap-2 rounded border border-white/5 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1 mb-1">
             <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
               Opacity
             </Label>
             <span className="text-[10px] font-bold text-white/70 tabular-nums">
                {Math.round(selectedOpacity * 100)}%
              </span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[selectedOpacity]}
            onValueChange={handleOpacityChange}
            aria-label="Image opacity"
            className="[&_[data-slot=range]]:bg-primary [&_[data-slot=thumb]]:h-3 [&_[data-slot=thumb]]:w-3 [&_[data-slot=thumb]]:border-none [&_[data-slot=track]]:h-1 [&_[data-slot=track]]:bg-white/10"
          />
        </div>
      )}

      {imageOverlays.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Image Layers
            </p>
          </div>
          
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-1.5 space-y-1">
            {imageOverlays.map((overlay) => {
              const isSelected = selectedOverlayId === overlay.id;
              return (
                <div
                  key={overlay.id}
                  className={cn(
                    "group flex items-center gap-1 px-1.5 py-1.5 rounded cursor-pointer transition-colors duration-100",
                    isSelected
                      ? "bg-primary/20 text-white"
                      : "hover:bg-white/[0.04] text-white/60 hover:text-white/90",
                    overlay.locked && "opacity-60"
                  )}
                  onClick={() => {
                    selectOverlay(overlay.id);
                    dispatch({ type: "SET_TOOL", payload: "image" });
                  }}
                >
                  <button
                    className={cn(
                      "shrink-0 p-0.5 rounded transition-opacity",
                      overlay.visible === false ? "opacity-30 hover:opacity-100 text-white" : "opacity-0 group-hover:opacity-100 text-white/50 hover:text-white"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOverlay(overlay.id, {
                        visible: overlay.visible === false ? true : false,
                      });
                    }}
                    aria-label={overlay.visible === false ? "Show layer" : "Hide layer"}
                    title={overlay.visible === false ? "Show layer" : "Hide layer"}
                  >
                    {overlay.visible === false ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    className={cn(
                      "shrink-0 p-0.5 rounded transition-opacity",
                      overlay.locked ? "text-amber-500/80 opacity-100 hover:text-amber-400" : "opacity-0 group-hover:opacity-100 text-white/50 hover:text-white"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOverlay(overlay.id, {
                        locked: !overlay.locked,
                      });
                    }}
                    aria-label={overlay.locked ? "Unlock layer" : "Lock layer"}
                    title={overlay.locked ? "Unlock layer" : "Lock layer"}
                  >
                    {overlay.locked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </button>
                  
                  {overlay.imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={overlay.imageDataUrl}
                      alt={overlay.content}
                      className="h-6 w-6 ml-1 mr-1 rounded object-cover shrink-0 block"
                    />
                  ) : (
                    <div className="flex h-6 w-6 ml-1 mr-1 shrink-0 items-center justify-center rounded bg-black/40">
                      <ImageIcon className="h-3 w-3 text-white/30" />
                    </div>
                  )}

                  <span className="text-[11px] font-semibold truncate flex-1" title={overlay.content}>
                    {overlay.content || "Image"}
                  </span>
                  
                  <button
                    className={cn(
                      "transition-opacity p-0.5 rounded bg-transparent hover:bg-white/10 active:scale-95 text-white/50 hover:text-white",
                      isSelected
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateOverlay(overlay.id);
                    }}
                    aria-label="Duplicate layer"
                    title="Duplicate layer"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    className={cn(
                      "transition-opacity p-0.5 rounded bg-transparent hover:bg-red-500/20 active:scale-95 text-white/50",
                      isSelected
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                      overlay.locked
                        ? "cursor-not-allowed text-white/20 hover:text-white/20 hover:bg-transparent"
                        : "hover:text-red-400"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOverlay(overlay.id);
                    }}
                    disabled={overlay.locked}
                    aria-label="Delete layer"
                    title={overlay.locked ? "Unlock layer to remove" : "Remove layer"}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {imageOverlays.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-white/[0.02] rounded-lg border border-white/5 border-dashed">
           <Images className="h-6 w-6 text-white/20 mb-2" />
           <p className="text-[11px] font-medium text-white/40 leading-relaxed">
             Open the <strong className="text-white/60 font-semibold mx-1">Image</strong> menu from the left rail to drop assets into the canvas.
           </p>
        </div>
      )}
    </div>
  );
}
