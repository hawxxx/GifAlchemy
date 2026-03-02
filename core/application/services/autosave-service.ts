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
  scheduleSave: (project: Project) => void;
  saveNow: (project: Project) => Promise<void>;
  subscribe: (listener: AutosaveListener) => () => void;
  getState: () => AutosaveServiceState;
} {
  let state: AutosaveServiceState = {
    saveStatus: "idle",
    lastSavedAt: null,
  };
  const listeners = new Set<AutosaveListener>();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingProject: Project | null = null;

  function setState(next: Partial<AutosaveServiceState>) {
    state = { ...state, ...next };
    listeners.forEach((l) => l(state));
  }

  function scheduleSave(project: Project) {
    pendingProject = project;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const toSave = pendingProject;
      pendingProject = null;
      if (toSave) saveNow(toSave);
    }, DEBOUNCE_MS);
  }

  async function saveNow(project: Project) {
    setState({ saveStatus: "saving" });
    try {
      await repo.save(project);
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
      if (document.visibilityState === "hidden" && pendingProject) {
        const toSave = pendingProject;
        pendingProject = null;
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        saveNow(toSave);
      }
    };
    const onPageHide = () => {
      if (pendingProject) {
        const toSave = pendingProject;
        pendingProject = null;
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        saveNow(toSave);
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
