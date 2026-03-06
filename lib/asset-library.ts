"use client";

import {
  deleteAssetFile,
  listAssetFiles,
  loadAssetFile,
  saveAssetFile,
  type StoredAsset,
} from "@/core/infrastructure/repositories/indexeddb-asset-library.adapter";

export type { StoredAsset };

export async function saveAsset(input: {
  file: File;
  previewDataUrl?: string;
  id?: string;
  kind?: "source" | "image";
}): Promise<StoredAsset> {
  return saveAssetFile(input.file, {
    previewDataUrl: input.previewDataUrl,
    kind: input.kind,
  });
}

export async function listAssets(limit = 24): Promise<StoredAsset[]> {
  const assets = await listAssetFiles();
  return assets.slice(0, limit);
}

export async function getAssetFile(id: string): Promise<File | null> {
  return loadAssetFile(id);
}

export async function deleteAsset(id: string): Promise<void> {
  return deleteAssetFile(id);
}

export async function saveStoredAsset(file: File, previewDataUrl?: string): Promise<StoredAsset> {
  return saveAsset({ file, previewDataUrl, kind: "source" });
}

export async function listStoredAssets(limit = 24): Promise<StoredAsset[]> {
  return listAssets(limit);
}

export async function getStoredAssetFile(id: string): Promise<File | null> {
  return getAssetFile(id);
}

export async function deleteStoredAsset(id: string): Promise<void> {
  return deleteAsset(id);
}
