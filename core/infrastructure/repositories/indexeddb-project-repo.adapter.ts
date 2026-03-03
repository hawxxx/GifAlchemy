import type {
  IProjectRepository,
  ProjectSummary,
  ProjectWithBlob,
} from "@/core/application/repositories/project-repository.port";
import type { Project } from "@/core/domain/project";

const DB_NAME = "gifalchemy-projects";
const STORE_PROJECTS = "projects";
const STORE_FILES = "files";
const DB_VERSION = 2;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: "id" });
      }
    };
  });
}

export function createIndexedDbProjectRepo(): IProjectRepository {
  return {
    async save(project: Project, fileBlob?: ArrayBuffer): Promise<void> {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_PROJECTS, STORE_FILES], "readwrite");
        const projectStore = tx.objectStore(STORE_PROJECTS);
        const fileStore = tx.objectStore(STORE_FILES);
        projectStore.put(project);
        if (fileBlob) {
          fileStore.put({ id: project.id, blob: fileBlob });
        }
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      });
    },

    async load(id: string): Promise<ProjectWithBlob | null> {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_PROJECTS, STORE_FILES], "readonly");
        const projectStore = tx.objectStore(STORE_PROJECTS);
        const fileStore = tx.objectStore(STORE_FILES);
        const projectReq = projectStore.get(id);
        const fileReq = fileStore.get(id);
        let project: Project | undefined;
        let fileBlob: ArrayBuffer | null = null;
        let done = 0;
        function maybeResolve() {
          done++;
          if (done === 2) {
            db.close();
            resolve(project ? { project, fileBlob } : null);
          }
        }
        projectReq.onsuccess = () => {
          project = projectReq.result as Project | undefined;
          maybeResolve();
        };
        fileReq.onsuccess = () => {
          const row = fileReq.result as { id: string; blob: ArrayBuffer } | undefined;
          fileBlob = row?.blob ?? null;
          maybeResolve();
        };
        tx.onerror = () => { db.close(); reject(tx.error); };
      });
    },

    async list(): Promise<ProjectSummary[]> {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, "readonly");
        const req = tx.objectStore(STORE_PROJECTS).getAll();
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
        const tx = db.transaction([STORE_PROJECTS, STORE_FILES], "readwrite");
        tx.objectStore(STORE_PROJECTS).delete(id);
        tx.objectStore(STORE_FILES).delete(id);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      });
    },
  };
}
