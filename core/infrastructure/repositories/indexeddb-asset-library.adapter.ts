"use client";

export interface StoredAsset {
  id: string;
  name: string;
  size: number;
  type: string;
  kind: "source" | "image";
  addedAt: number;
  updatedAt: number;
  previewDataUrl?: string;
  width?: number;
  height?: number;
}

interface StoredAssetRow extends StoredAsset {
  file: Blob;
}

const DB_NAME = "gifalchemy-library";
const DB_VERSION = 1;
const STORE_ASSETS = "assets";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        db.createObjectStore(STORE_ASSETS, { keyPath: "id" });
      }
    };
  });
}

function createAssetId(file: File): string {
  return `asset_${file.name}_${file.size}_${file.lastModified}_${file.type || "unknown"}`;
}

export async function saveAssetFile(
  file: File,
  options?: Partial<Pick<StoredAsset, "previewDataUrl" | "width" | "height" | "kind">>
): Promise<StoredAsset> {
  const db = await openDb();
  const id = createAssetId(file);
  const now = Date.now();
  const row: StoredAssetRow = {
    id,
    name: file.name,
    size: file.size,
    type: file.type,
    kind: options?.kind ?? (file.type.startsWith("image/") ? "image" : "source"),
    addedAt: now,
    updatedAt: now,
    previewDataUrl: options?.previewDataUrl,
    width: options?.width,
    height: options?.height,
    file,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ASSETS, "readwrite");
    const store = tx.objectStore(STORE_ASSETS);
    const existingReq = store.get(id);

    existingReq.onsuccess = () => {
      const existing = existingReq.result as StoredAssetRow | undefined;
      if (existing) {
        row.addedAt = existing.addedAt;
        row.updatedAt = now;
        row.previewDataUrl = options?.previewDataUrl ?? existing.previewDataUrl;
        row.width = options?.width ?? existing.width;
        row.height = options?.height ?? existing.height;
      }
      store.put(row);
    };
    existingReq.onerror = () => reject(existingReq.error);
    tx.oncomplete = () => {
      db.close();
      const { file: _file, ...meta } = row;
      resolve(meta);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function listAssetFiles(): Promise<StoredAsset[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ASSETS, "readonly");
    const req = tx.objectStore(STORE_ASSETS).getAll();
    req.onsuccess = () => {
      db.close();
      const rows = (req.result as StoredAssetRow[] | undefined) ?? [];
      resolve(
        rows
          .map(({ file: _file, ...meta }) => meta)
          .sort((a, b) => b.updatedAt - a.updatedAt)
      );
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function loadAssetFile(id: string): Promise<File | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ASSETS, "readonly");
    const req = tx.objectStore(STORE_ASSETS).get(id);
    req.onsuccess = () => {
      db.close();
      const row = req.result as StoredAssetRow | undefined;
      if (!row) {
        resolve(null);
        return;
      }
      const blob = row.file;
      resolve(
        new File([blob], row.name, {
          type: row.type,
          lastModified: row.updatedAt,
        })
      );
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function deleteAssetFile(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ASSETS, "readwrite");
    tx.objectStore(STORE_ASSETS).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
