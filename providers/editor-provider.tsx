"use client";

import React, { useReducer, createContext, useMemo, useCallback } from "react";
import type { IGifProcessor } from "@/core/application/processors/gif-processor.port";
import type { IProjectRepository } from "@/core/application/repositories/project-repository.port";
import type { GifFrame, GifMetadata, ProcessingProgress } from "@/core/domain/gif-types";
import type { Overlay, OutputSettings } from "@/core/domain/project";
import type { ToolId } from "@/lib/constants";

const UNDO_HISTORY_MAX = 50;

type UndoableSnapshot = Pick<EditorState, "overlays" | "outputSettings" | "projectName" | "trimStart" | "trimEnd">;

export type EditorStatus = "empty" | "loading" | "ready" | "processing" | "error";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface EditorState {
  status: EditorStatus;
  file: File | null;
  frames: GifFrame[];
  metadata: GifMetadata | null;
  currentFrameIndex: number;
  activeTool: ToolId | null;
  overlays: Overlay[];
  selectedOverlayId: string | null;
  outputSettings: OutputSettings;
  processorReady: boolean;
  processingProgress: ProcessingProgress | null;
  error: string | null;
  saveStatus: SaveStatus;
  projectName: string;
  isPlaying: boolean;
  /** First frame (inclusive) for export trim. */
  trimStart: number;
  /** Last frame (inclusive) for export trim. */
  trimEnd: number;
  /** Playback speed multiplier (0.5, 1, 2). */
  playbackRate: number;
}

const defaultOutputSettings: OutputSettings = {
  width: 0,
  height: 0,
  format: "gif",
  quality: 80,
};

const initialState: EditorState = {
  status: "empty",
  file: null,
  frames: [],
  metadata: null,
  currentFrameIndex: 0,
  activeTool: null,
  overlays: [],
  selectedOverlayId: null,
  outputSettings: defaultOutputSettings,
  processorReady: false,
  processingProgress: null,
  error: null,
  saveStatus: "idle",
  projectName: "Untitled",
  isPlaying: false,
  trimStart: 0,
  trimEnd: 0,
  playbackRate: 1,
};

export type EditorAction =
  | { type: "UPLOAD_START" }
  | { type: "UPLOAD_SUCCESS"; payload: { file: File; frames: GifFrame[]; metadata: GifMetadata } }
  | { type: "UPLOAD_ERROR"; payload: string }
  | { type: "SET_TOOL"; payload: ToolId | null }
  | { type: "UPDATE_OUTPUT_SETTINGS"; payload: Partial<OutputSettings> }
  | { type: "ADD_OVERLAY"; payload: Overlay }
  | { type: "UPDATE_OVERLAY"; payload: { id: string; updates: Partial<Overlay> } }
  | { type: "REMOVE_OVERLAY"; payload: string }
  | { type: "SELECT_OVERLAY"; payload: string | null }
  | { type: "SET_FRAME"; payload: number }
  | { type: "PROCESSING_START" }
  | { type: "PROCESSING_PROGRESS"; payload: ProcessingProgress }
  | { type: "PROCESSING_DONE" }
  | { type: "PROCESSING_ERROR"; payload: string }
  | { type: "PROCESSOR_READY" }
  | { type: "SET_SAVE_STATUS"; payload: SaveStatus }
  | { type: "SET_PROJECT_NAME"; payload: string }
  | { type: "SET_OVERLAYS"; payload: Overlay[] }
  | { type: "SET_PLAYING"; payload: boolean }
  | { type: "SET_TRIM"; payload: { trimStart: number; trimEnd: number } }
  | { type: "SET_PLAYBACK_RATE"; payload: number }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESTORE_SNAPSHOT"; payload: UndoableSnapshot }
  | {
      type: "RESTORE_PROJECT";
      payload: {
        file: File;
        frames: GifFrame[];
        metadata: GifMetadata;
        overlays: Overlay[];
        outputSettings: OutputSettings;
        projectName: string;
        trimStart: number;
        trimEnd: number;
      };
    }
  | { type: "RESET" };

const UNDOABLE_ACTIONS = new Set<string>([
  "UPDATE_OUTPUT_SETTINGS",
  "ADD_OVERLAY",
  "UPDATE_OVERLAY",
  "REMOVE_OVERLAY",
  "SET_PROJECT_NAME",
  "SET_TRIM",
]);

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "UPLOAD_START":
      return { ...state, status: "loading", error: null };
    case "UPLOAD_SUCCESS": {
      const { file, frames, metadata } = action.payload;
      const lastFrame = Math.max(0, frames.length - 1);
      return {
        ...state,
        status: "ready",
        file,
        frames,
        metadata,
        currentFrameIndex: 0,
        outputSettings: {
          ...state.outputSettings,
          width: metadata.width,
          height: metadata.height,
        },
        error: null,
        isPlaying: false,
        projectName:
          state.projectName === "Untitled"
            ? file.name.replace(/\.[^.]+$/, "") || "Untitled"
            : state.projectName,
        trimStart: 0,
        trimEnd: lastFrame,
      };
    }
    case "UPLOAD_ERROR":
      return { ...state, status: "error", error: action.payload, isPlaying: false };
    case "SET_TOOL":
      return { ...state, activeTool: action.payload };
    case "UPDATE_OUTPUT_SETTINGS":
      return { ...state, outputSettings: { ...state.outputSettings, ...action.payload } };
    case "ADD_OVERLAY": {
      const overlay = action.payload;
      return {
        ...state,
        overlays: [...state.overlays, overlay],
        selectedOverlayId: overlay.id,
      };
    }
    case "UPDATE_OVERLAY": {
      const { id, updates } = action.payload;
      return {
        ...state,
        overlays: state.overlays.map((o) => (o.id === id ? { ...o, ...updates } : o)),
      };
    }
    case "REMOVE_OVERLAY":
      return {
        ...state,
        overlays: state.overlays.filter((o) => o.id !== action.payload),
        selectedOverlayId:
          state.selectedOverlayId === action.payload ? null : state.selectedOverlayId,
      };
    case "SELECT_OVERLAY":
      return { ...state, selectedOverlayId: action.payload };
    case "SET_FRAME":
      return {
        ...state,
        currentFrameIndex: Math.max(0, Math.min(action.payload, state.frames.length - 1)),
      };
    case "PROCESSING_START":
      return { ...state, status: "processing", processingProgress: { phase: "", percent: 0 } };
    case "PROCESSING_PROGRESS":
      return { ...state, processingProgress: action.payload };
    case "PROCESSING_DONE":
      return { ...state, status: "ready", processingProgress: null };
    case "PROCESSING_ERROR":
      return { ...state, status: "error", error: action.payload, processingProgress: null };
    case "PROCESSOR_READY":
      return { ...state, processorReady: true };
    case "SET_SAVE_STATUS":
      return { ...state, saveStatus: action.payload };
    case "SET_PROJECT_NAME":
      return { ...state, projectName: action.payload };
    case "SET_OVERLAYS":
      return { ...state, overlays: action.payload };
    case "SET_PLAYING":
      return { ...state, isPlaying: action.payload };
    case "SET_TRIM": {
      const last = Math.max(0, state.frames.length - 1);
      let start = Math.max(0, Math.min(last, action.payload.trimStart));
      let end = Math.max(0, Math.min(last, action.payload.trimEnd));
      if (end < start) end = start;
      return { ...state, trimStart: start, trimEnd: end };
    }
    case "SET_PLAYBACK_RATE": {
      const rate = [0.5, 1, 2].includes(action.payload) ? action.payload : 1;
      return { ...state, playbackRate: rate };
    }
    case "RESTORE_SNAPSHOT":
      return { ...state, ...action.payload };
    case "RESTORE_PROJECT": {
      const p = action.payload;
      return {
        ...state,
        status: "ready",
        file: p.file,
        frames: p.frames,
        metadata: p.metadata,
        currentFrameIndex: 0,
        overlays: p.overlays,
        selectedOverlayId: p.overlays[0]?.id ?? null,
        outputSettings: p.outputSettings,
        projectName: p.projectName,
        trimStart: p.trimStart,
        trimEnd: p.trimEnd,
        error: null,
        isPlaying: false,
      };
    }
    case "RESET":
      return { ...initialState, projectName: state.projectName };
    default:
      return state;
  }
}

export interface EditorHistoryState {
  past: UndoableSnapshot[];
  future: UndoableSnapshot[];
}

export interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  processor: IGifProcessor | null;
  projectRepo: IProjectRepository | null;
  processingAbortRef: React.MutableRefObject<AbortController | null>;
  contentInputRef: React.RefObject<HTMLInputElement | null>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export interface EditorProviderProps {
  children: React.ReactNode;
  processor: IGifProcessor | null;
  projectRepo: IProjectRepository | null;
}

function snapshot(s: EditorState): UndoableSnapshot {
  return {
    overlays: s.overlays.map((o) => ({ ...o, keyframes: o.keyframes.map((k) => ({ ...k })) })),
    outputSettings: { ...s.outputSettings },
    projectName: s.projectName,
    trimStart: s.trimStart,
    trimEnd: s.trimEnd,
  };
}

export function EditorProvider({ children, processor, projectRepo }: EditorProviderProps) {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const [history, setHistory] = React.useState<EditorHistoryState>({ past: [], future: [] });
  const processingAbortRef = React.useRef<AbortController | null>(null);
  const contentInputRef = React.useRef<HTMLInputElement | null>(null);

  const stableDispatch = useCallback(
    (action: EditorAction) => {
      if (action.type === "UNDO") {
        if (history.past.length === 0) return;
        const prev = history.past[history.past.length - 1];
        setHistory({
          past: history.past.slice(0, -1),
          future: [snapshot(state), ...history.future].slice(0, UNDO_HISTORY_MAX),
        });
        dispatch({ type: "RESTORE_SNAPSHOT", payload: prev });
        return;
      }
      if (action.type === "REDO") {
        if (history.future.length === 0) return;
        const next = history.future[0];
        setHistory({
          past: [...history.past, snapshot(state)].slice(-UNDO_HISTORY_MAX),
          future: history.future.slice(1),
        });
        dispatch({ type: "RESTORE_SNAPSHOT", payload: next });
        return;
      }
      if (action.type === "RESET") setHistory({ past: [], future: [] });
      else if (UNDOABLE_ACTIONS.has(action.type))
        setHistory((h) => ({
          past: [...h.past, snapshot(state)].slice(-UNDO_HISTORY_MAX),
          future: [],
        }));
      dispatch(action);
    },
    [state, history.past, history.future]
  );

  const undo = useCallback(() => stableDispatch({ type: "UNDO" }), [stableDispatch]);
  const redo = useCallback(() => stableDispatch({ type: "REDO" }), [stableDispatch]);

  const value = useMemo<EditorContextValue>(
    () => ({
      state,
      dispatch: stableDispatch,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      processor,
      projectRepo,
      processingAbortRef,
      contentInputRef,
    }),
    [state, history.past.length, history.future.length, stableDispatch, undo, redo, processor, projectRepo]
  );
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditorContext(): EditorContextValue {
  const ctx = React.useContext(EditorContext);
  if (!ctx) throw new Error("useEditorContext must be used within EditorProvider");
  return ctx;
}
