"use client";

import React, { useRef } from "react";
import { Upload, FileImage, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
import { useAssetLibrary } from "@/hooks/use-asset-library";

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

export function UploadsSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { assets, saveAsset, removeAsset } = useAssetLibrary();
  const uploads = assets.filter((asset) => asset.kind === "source");

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

  function handleRemove(id: string) {
    void removeAsset(id);
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {uploads.map((upload: StoredAsset) => (
          <div
            key={upload.id}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-[var(--muted)]">
              {upload.previewDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={upload.previewDataUrl} alt={upload.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <FileImage className="h-8 w-8 text-[var(--muted-foreground)]" />
                </div>
              )}
              <button
                onClick={() => handleRemove(upload.id)}
                className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 opacity-0 transition-opacity hover:bg-black/90 group-hover:opacity-100"
                aria-label="Remove upload"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
            <div className="px-2 py-1.5">
              <p className="truncate text-xs font-medium text-[var(--foreground)]">{upload.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {formatBytes(upload.size)} · {(upload.type || "asset")
                  .replace(/^image\//, "")
                  .replace(/^video\//, "")
                  .toUpperCase()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
