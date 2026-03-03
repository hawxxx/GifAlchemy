"use client";

import React, { useRef } from "react";
import { Upload, FileImage, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

export interface StoredUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  addedAt: number;
}

interface UploadsSectionProps {
  uploads: StoredUpload[];
  onUploadsChange: (uploads: StoredUpload[]) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadsSection({ uploads, onUploadsChange }: UploadsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string | undefined;
        const newUpload: StoredUpload = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
          addedAt: Date.now(),
        };
        onUploadsChange([...uploads, newUpload]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  }

  function handleRemove(id: string) {
    onUploadsChange(uploads.filter((u) => u.id !== id));
  }

  if (uploads.length === 0) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/gif"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <EmptyState
          icon={<Upload className="h-7 w-7" />}
          title="No uploads yet"
          description="Upload GIF files to use as source material in your projects."
          action={{ label: "Upload GIF", onClick: () => fileInputRef.current?.click() }}
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
          accept="image/gif"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Upload GIF
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className="group relative flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-[var(--muted)]">
              {upload.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={upload.dataUrl} alt={upload.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <FileImage className="h-8 w-8 text-[var(--muted-foreground)]" />
                </div>
              )}
              <button
                onClick={() => handleRemove(upload.id)}
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90"
                aria-label="Remove upload"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
            <div className="px-2 py-1.5">
              <p className="truncate text-xs font-medium text-[var(--foreground)]">{upload.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{formatBytes(upload.size)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
