"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileImage, X, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
import { useAssetLibrary, type StoredAsset } from "@/hooks/use-asset-library";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsDataUrl(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string | undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

const SAMPLE_ASSET: StoredAsset = {
  id: "quick-try-sample",
  name: "Quick Try: Kid Meme",
  type: "image/gif",
  size: 500000,
  kind: "source",
  previewDataUrl: "https://media1.tenor.com/m/F7Cd9OI_XRQAAAAd/kid-meme.gif",
  addedAt: Date.now(),
  updatedAt: Date.now(),
};
const SAMPLE_URL = "https://media1.tenor.com/m/F7Cd9OI_XRQAAAAd/kid-meme.gif";

export function UploadsSection() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { assets, saveAsset, removeAsset } = useAssetLibrary();
  const dbUploads = assets.filter((asset) => asset.kind === "source");
  const uploads = [SAMPLE_ASSET, ...dbUploads];

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    await Promise.all(
      files.map(async (file) => {
        const previewDataUrl = await readAsDataUrl(file);
        await saveAsset(file, { previewDataUrl, kind: "source" });
      })
    );

    e.target.value = "";
  }

  function handleRemove(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    void removeAsset(id);
  }

  function handleCardClick(id: string) {
    if (id === "quick-try-sample") {
      router.push(`/editor?url=${encodeURIComponent(SAMPLE_URL)}`);
    } else {
      router.push(`/editor?asset=${id}`);
    }
  }

  if (uploads.length === 0) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/gif,video/webm,video/mp4,image/png"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <EmptyState
          icon={<Upload className="h-7 w-7" />}
          title="No uploads yet"
          description="Upload GIF, WebM, MP4, or PNG files to keep source assets available after refresh."
          action={{ label: "Upload Assets", onClick: () => fileInputRef.current?.click() }}
        />
      </>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/gif,video/webm,video/mp4,image/png"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Upload Assets
        </Button>
      </div>

      <div className="relative -mx-6 px-6 sm:-mx-0 sm:px-0">
        <div className="flex w-full gap-4 overflow-x-auto pb-4 snap-x scrollbar-hide py-1">
          {uploads.map((upload: StoredAsset) => (
            <div
              key={upload.id}
              onClick={() => handleCardClick(upload.id)}
              className="group relative flex w-[140px] shrink-0 sm:w-[160px] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] snap-center transition-all duration-300 hover:border-[var(--primary)]/40 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-[var(--muted)]/50">
                {upload.previewDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={upload.previewDataUrl} alt={upload.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <FileImage className="h-8 w-8 text-[var(--muted-foreground)]" />
                  </div>
                )}
                
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <PlayCircle className="h-10 w-10 text-white/90 drop-shadow-md" />
                </div>
                
                {/* Overlay gradient for text readability if needed */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
                
                {upload.id !== "quick-try-sample" && (
                  <button
                    onClick={(e) => handleRemove(e, upload.id)}
                    className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 opacity-0 backdrop-blur-md transition-all duration-200 hover:bg-destructive hover:scale-110 group-hover:opacity-100 shadow-sm"
                    aria-label="Remove upload"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                )}
              </div>
              <div className="px-3 py-2.5">
                <p className="truncate text-xs font-medium text-[var(--foreground)]">{upload.name}</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                  {formatBytes(upload.size)} <span className="mx-1 opacity-50">•</span> {(upload.type || "asset")
                    .replace(/^image\//, "")
                    .replace(/^video\//, "")
                    .toUpperCase()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
