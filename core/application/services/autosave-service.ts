import type { IProjectRepository } from "@/core/application/repositories/project-repository.port";
import type { Project } from "@/core/domain/project";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 2000;

export interface AutosaveServiceState {
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
}

export type AutosaveListener = (state: AutosaveServiceState) => void;

export function createAutosaveService(
  repo: IProjectRepository
): {
  scheduleSave: (project: Project, file?: File | null) => void;
  saveNow: (project: Project, file?: File | null) => Promise<void>;
  subscribe: (listener: AutosaveListener) => () => void;
  getState: () => AutosaveServiceState;
} {
  let state: AutosaveServiceState = {
    saveStatus: "idle",
    lastSavedAt: null,
  };
  const listeners = new Set<AutosaveListener>();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pending: { project: Project; file: File | null } | null = null;

  function setState(next: Partial<AutosaveServiceState>) {
    state = { ...state, ...next };
    listeners.forEach((l) => l(state));
  }

  function scheduleSave(project: Project, file?: File | null) {
    pending = { project, file: file ?? null };
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const toSave = pending;
      pending = null;
      if (toSave) saveNow(toSave.project, toSave.file);
    }, DEBOUNCE_MS);
  }

  async function saveNow(project: Project, file?: File | null) {
    setState({ saveStatus: "saving" });
    try {
      let fileBlob: ArrayBuffer | undefined;
      if (file) {
        fileBlob = await file.arrayBuffer();
      }
      await repo.save(project, fileBlob);
      setState({
        saveStatus: "saved",
        lastSavedAt: Date.now(),
      });
    } catch {
      setState({ saveStatus: "error" });
    }
  }

  function subscribe(listener: AutosaveListener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getState() {
    return state;
  }

  if (typeof document !== "undefined") {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && pending) {
        const toSave = pending;
        pending = null;
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        saveNow(toSave.project, toSave.file);
      }
    };
    const onPageHide = () => {
      if (pending) {
        const toSave = pending;
        pending = null;
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        saveNow(toSave.project, toSave.file);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
  }

  return {
    scheduleSave,
    saveNow,
    subscribe,
    getState,
  };
}
