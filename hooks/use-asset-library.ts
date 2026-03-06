"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteAssetFile,
  listAssetFiles,
  loadAssetFile,
  saveAssetFile,
  type StoredAsset,
} from "@/core/infrastructure/repositories/indexeddb-asset-library.adapter";

export function useAssetLibrary() {
  const [assets, setAssets] = useState<StoredAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setAssets(await listAssetFiles());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveAsset = useCallback(
    async (file: File, options?: Parameters<typeof saveAssetFile>[1]) => {
      const asset = await saveAssetFile(file, options);
      setAssets((prev) => [asset, ...prev.filter((item) => item.id !== asset.id)]);
      return asset;
    },
    []
  );

  const removeAsset = useCallback(async (id: string) => {
    await deleteAssetFile(id);
    setAssets((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const openAssetFile = useCallback((id: string) => loadAssetFile(id), []);

  return {
    assets,
    loading,
    refresh,
    saveAsset,
    removeAsset,
    openAssetFile,
  };
}
