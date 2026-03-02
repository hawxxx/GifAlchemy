import type { IProjectRepository, ProjectSummary } from "@/core/application/repositories/project-repository.port";
import type { Project } from "@/core/domain/project";

const DB_NAME = "gifalchemy-projects";
const STORE = "projects";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
  });
}

export function createIndexedDbProjectRepo(): IProjectRepository {
  return {
    async save(project: Project): Promise<void> {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        store.put(project);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      });
    },

    async load(id: string): Promise<Project | null> {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(id);
        req.onsuccess = () => {
          db.close();
          resolve((req.result as Project) ?? null);
        };
        req.onerror = () => { db.close(); reject(req.error); };
      });
    },

    async list(): Promise<ProjectSummary[]> {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => {
          db.close();
          const rows = (req.result as Project[]) ?? [];
          resolve(
            rows
              .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt }))
              .sort((a, b) => b.updatedAt - a.updatedAt)
          );
        };
        req.onerror = () => { db.close(); reject(req.error); };
      });
    },

    async delete(id: string): Promise<void> {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      });
    },
  };
}
