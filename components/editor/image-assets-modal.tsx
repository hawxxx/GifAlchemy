"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorModal } from "./editor-modal";
import { createImageOverlay } from "@/core/application/commands/overlay-commands";
import { getAssetFile, listAssets, saveAsset, type StoredAsset } from "@/lib/asset-library";
import { useEditor } from "@/hooks/use-editor";
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

export interface ImageAssetsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ImageAssetsModal({ open, onClose }: ImageAssetsModalProps) {
  const { state, dispatch } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [storedAssets, setStoredAssets] = useState<StoredAsset[]>([]);

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

  const createOverlayFromFile = useCallback(
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
          [asset, ...prev.filter((item) => item.id !== asset.id)].filter(isSupportedImageAsset).slice(0, 48)
        );
      }

      onClose();
    },
    [dispatch, onClose, selectedImageOverlay, state.frames.length]
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const file = files[0];
      if (!/^image\/(png|webp|jpeg|jpg)$/i.test(file.type)) return;
      await createOverlayFromFile(file);
    },
    [createOverlayFromFile]
  );

  const handleAssetPick = useCallback(
    async (assetId: string) => {
      const file = await getAssetFile(assetId);
      if (!file || !/^image\/(png|webp|jpeg|jpg)$/i.test(file.type)) return;
      await createOverlayFromFile(file);
    },
    [createOverlayFromFile]
  );

  return (
    <EditorModal
      open={open}
      onClose={onClose}
      title="Image assets"
      description="Upload a new image overlay or reuse a saved asset without crowding the inspector."
      className="max-w-4xl border-white/10 bg-[linear-gradient(180deg,rgba(16,21,29,0.98),rgba(9,12,17,0.98))] text-white shadow-[0_28px_80px_rgba(0,0,0,0.5)]"
    >
      <div className="space-y-4">
        <div
          className={cn(
            "rounded-[22px] border border-dashed px-6 py-8 text-center transition-all duration-200",
            isDraggingOver
              ? "border-primary/55 bg-primary/10"
              : "border-white/10 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]"
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
            if (event.key === "Enter") fileInputRef.current?.click();
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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <Upload className="h-6 w-6 text-white/82" />
          </div>
          <p className="mt-4 text-base font-semibold text-white/92">Upload image overlay</p>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Drop PNG, WebP, or JPG here, or click to browse local files.
          </p>
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-[14px] border-white/10 bg-white/[0.04] px-4 text-white hover:bg-white/[0.08]"
            >
              Browse images
            </Button>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                Uploaded assets
              </p>
              <p className="mt-1 text-sm text-white/58">
                Persistent image assets ready to reuse as overlays.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/55">
              {storedAssets.length}
            </span>
          </div>

          {storedAssets.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {storedAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => void handleAssetPick(asset.id)}
                  className="group overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] text-left transition-colors hover:border-white/16 hover:bg-white/[0.06]"
                >
                  <div className="flex h-28 items-center justify-center overflow-hidden bg-[repeating-conic-gradient(#161a20_0%_25%,#20252d_0%_50%)_50%_/_12px_12px]">
                    {asset.previewDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.previewDataUrl}
                        alt={asset.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-white/42" />
                    )}
                  </div>
                  <div className="space-y-1 px-3 py-2">
                    <p className="truncate text-xs font-medium text-white/90" title={asset.name}>
                      {asset.name}
                    </p>
                    <p className="text-[10px] text-white/42">
                      {formatBytes(asset.size)}
                      {asset.width && asset.height ? ` · ${asset.width}x${asset.height}` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/45">
              No uploaded image assets yet.
            </div>
          )}
        </div>
      </div>
    </EditorModal>
  );
}
