"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createImageOverlay } from "@/core/application/commands/overlay-commands";
import { useEditor } from "@/hooks/use-editor";
import { getAssetFile, listAssets, saveAsset, type StoredAsset } from "@/lib/asset-library";
import { cn, formatBytes } from "@/lib/utils";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image asset."));
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = dataUrl;
  });
}

function isSupportedImageAsset(asset: StoredAsset) {
  return /^image\/(png|webp|jpeg|jpg)$/i.test(asset.type);
}

export interface ImageAssetsSubmenuProps {
  open: boolean;
  onClose: () => void;
  className?: string;
}

export function ImageAssetsSubmenu({ open, onClose, className }: ImageAssetsSubmenuProps) {
  const { state, dispatch } = useEditor();
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [storedAssets, setStoredAssets] = useState<StoredAsset[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [busyAssetId, setBusyAssetId] = useState<string | null>(null);

  const selectedImageOverlay = useMemo(() => {
    return state.overlays.find(
      (overlay) => overlay.id === state.selectedOverlayId && overlay.type === "image"
    );
  }, [state.overlays, state.selectedOverlayId]);

  useEffect(() => {
    if (!open) return;
    let active = true;

    void listAssets(48)
      .then((assets) => {
        if (!active) return;
        setStoredAssets(assets.filter(isSupportedImageAsset));
      })
      .catch(() => {
        if (active) setStoredAssets([]);
      });

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const handlePointerDown = (event: PointerEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (event.target instanceof Node && !panel.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  const applyImageFile = useCallback(
    async (file: File) => {
      const dataUrl = await readFileAsDataUrl(file);
      const { width, height } = await getImageDimensions(dataUrl);

      const replaceTarget =
        selectedImageOverlay?.type === "image" && !selectedImageOverlay.imageDataUrl
          ? selectedImageOverlay
          : null;

      if (replaceTarget) {
        dispatch({
          type: "UPDATE_OVERLAY",
          payload: {
            id: replaceTarget.id,
            updates: {
              content: file.name,
              imageDataUrl: dataUrl,
              imageWidth: width,
              imageHeight: height,
            },
          },
        });
      } else {
        dispatch({
          type: "ADD_OVERLAY",
          payload: createImageOverlay(state.frames.length, {
            content: file.name,
            imageDataUrl: dataUrl,
            imageWidth: width,
            imageHeight: height,
          }),
        });
      }

      dispatch({ type: "SET_TOOL", payload: "image" });

      const asset = await saveAsset({
        file,
        previewDataUrl: dataUrl,
        kind: "image",
      }).catch(() => null);

      if (asset) {
        setStoredAssets((prev) =>
          [asset, ...prev.filter((item) => item.id !== asset.id)]
            .filter(isSupportedImageAsset)
            .slice(0, 48)
        );
      }
    },
    [dispatch, selectedImageOverlay, state.frames.length]
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const file = files[0];
      if (!/^image\/(png|webp|jpeg|jpg)$/i.test(file.type)) return;
      await applyImageFile(file);
    },
    [applyImageFile]
  );

  const handleAssetPick = useCallback(
    async (assetId: string) => {
      setBusyAssetId(assetId);
      try {
        const file = await getAssetFile(assetId);
        if (!file || !/^image\/(png|webp|jpeg|jpg)$/i.test(file.type)) return;
        await applyImageFile(file);
      } finally {
        setBusyAssetId(null);
      }
    },
    [applyImageFile]
  );

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute left-0 right-0 top-[calc(100%+12px)] z-40 overflow-hidden rounded-[22px] border border-white/10",
        "bg-[linear-gradient(180deg,rgba(18,23,31,0.97),rgba(10,13,19,0.98))] shadow-[0_28px_72px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl",
        "animate-[fade-in_180ms_ease-out] md:left-[calc(100%+14px)] md:right-auto md:top-0 md:w-[360px]",
        className
      )}
      role="dialog"
      aria-label="Image assets submenu"
    >
      <div className="border-b border-white/8 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Image assets
            </p>
            <p className="mt-1 text-sm font-medium text-white/88">Drag onto the canvas or click to place.</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl border border-white/8 bg-white/[0.03] text-white/72 hover:bg-white/[0.08] hover:text-white"
            onClick={onClose}
            aria-label="Close image assets"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div
          className={cn(
            "mt-3 rounded-2xl border border-dashed px-3 py-3 transition-all duration-200",
            isDraggingOver
              ? "border-primary/55 bg-primary/10"
              : "border-white/10 bg-white/[0.03] hover:border-white/18 hover:bg-white/[0.05]"
          )}
          onClick={() => fileInputRef.current?.click()}
          onDrop={(event) => {
            event.preventDefault();
            setIsDraggingOver(false);
            void handleFiles(event.dataTransfer.files);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/webp,image/jpeg"
            className="sr-only"
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Upload className="h-4 w-4 text-white/82" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white/90">Upload overlay image</p>
              <p className="text-[11px] leading-5 text-white/52">PNG, WebP, or JPG. Stored for reuse after refresh.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/56">
              {storedAssets.length}
            </span>
          </div>
        </div>
      </div>

      <div className="max-h-[min(60vh,520px)] overflow-y-auto px-3 py-3">
        {storedAssets.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {storedAssets.map((asset) => {
              const isBusy = busyAssetId === asset.id;
              return (
                <button
                  key={asset.id}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-gifalchemy-image-asset-id", asset.id);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => void handleAssetPick(asset.id)}
                  className={cn(
                    "group overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] text-left transition-all duration-150",
                    "hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.06]",
                    isBusy && "border-primary/35 bg-primary/10"
                  )}
                  title={asset.name}
                >
                  <div className="relative flex h-24 items-center justify-center overflow-hidden bg-[repeating-conic-gradient(#171b21_0%_25%,#20252d_0%_50%)_50%_/_12px_12px]">
                    {asset.previewDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.previewDataUrl}
                        alt={asset.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-white/45" />
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/55 to-transparent px-2 pb-2 pt-6 text-[10px] uppercase tracking-[0.12em] text-white/72 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      <span>Drag</span>
                      <span>Click</span>
                    </div>
                  </div>
                  <div className="space-y-1 px-3 py-2.5">
                    <p className="truncate text-xs font-medium text-white/92">{asset.name}</p>
                    <p className="text-[10px] tabular-nums text-white/46">
                      {formatBytes(asset.size)}
                      {asset.width && asset.height ? ` · ${asset.width}x${asset.height}` : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
            <p className="text-sm font-medium text-white/84">No uploaded image assets yet.</p>
            <p className="mt-1 text-[11px] leading-5 text-white/50">
              Upload an image above, then drag it into the editor whenever you need it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
