import type {
  IProjectRepository,
  ProjectSummary,
  ProjectWithBlob,
} from "@/core/application/repositories/project-repository.port";
import type { Project } from "@/core/domain/project";

const PREFIX = "gifalchemy:ls:";
const LIST_KEY = `${PREFIX}projectList`;
const MAX_FILE_SIZE_B64 = 5 * 1024 * 1024; // ~5MB base64 payload
const MAX_LIST = 50;

function projectKey(id: string): string {
  return `${PREFIX}project:${id}`;
}

function fileKey(id: string): string {
  return `${PREFIX}file:${id}`;
}

function getList(): ProjectSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProjectSummary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveList(list: ProjectSummary[]): void {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list.slice(0, MAX_LIST)));
  } catch {
    // quota or disabled
  }
}

export function createLocalStorageProjectRepo(): IProjectRepository {
  return {
    async save(project: Project, fileBlob?: ArrayBuffer): Promise<void> {
      try {
        const summary: ProjectSummary = {
          id: project.id,
          name: project.name,
          updatedAt: project.updatedAt,
        };
        const list = getList().filter((p) => p.id !== project.id);
        list.unshift(summary);
        saveList(list);

        localStorage.setItem(projectKey(project.id), JSON.stringify(project));

        if (fileBlob && fileBlob.byteLength > 0) {
          const base64 = arrayBufferToBase64(fileBlob);
          if (base64.length <= MAX_FILE_SIZE_B64) {
            localStorage.setItem(fileKey(project.id), base64);
          }
        }
      } catch {
        // quota exceeded or private browsing
      }
    },

    async load(id: string): Promise<ProjectWithBlob | null> {
      if (typeof window === "undefined") return null;
      try {
        const rawProject = localStorage.getItem(projectKey(id));
        if (!rawProject) return null;
        const project = JSON.parse(rawProject) as Project;
        let fileBlob: ArrayBuffer | null = null;
        const rawFile = localStorage.getItem(fileKey(id));
        if (rawFile) {
          try {
            fileBlob = base64ToArrayBuffer(rawFile);
          } catch {
            // invalid base64
          }
        }
        return { project, fileBlob };
      } catch {
        return null;
      }
    },

    async list(): Promise<ProjectSummary[]> {
      return getList();
    },

    async delete(id: string): Promise<void> {
      try {
        localStorage.removeItem(projectKey(id));
        localStorage.removeItem(fileKey(id));
        saveList(getList().filter((p) => p.id !== id));
      } catch {
        // ignore
      }
    },
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa !== "undefined" ? btoa(binary) : "";
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
