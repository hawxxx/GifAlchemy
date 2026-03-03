"use client";

import { useEffect } from "react";
import { useEditor } from "./use-editor";
import { TOOLS_ACTIVE } from "@/lib/constants";

const TOOL_SHORTCUTS: Array<{ key: string; tool: (typeof TOOLS_ACTIVE)[number] }> = [
  { key: "1", tool: "resize" },
  { key: "2", tool: "trim" },
  { key: "3", tool: "text" },
];

/**
 * Global keyboard shortcuts for the editor:
 * - Undo/redo and duplicate/remove selected overlay
 * - Play/pause and frame stepping
 * - Tool switching for active tools
 * - Quick export request
 * Only active when the target is not an input/textarea/contenteditable.
 */
export function useEditorKeyboard() {
  const { state, dispatch, undo, redo, canUndo, canRedo } = useEditor();

  useEffect(() => {
    const duplicateSelected = () => {
      if (!state.selectedOverlayId) return;
      const overlay = state.overlays.find((o) => o.id === state.selectedOverlayId);
      if (!overlay) return;
      const newId = `ol_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      dispatch({
        type: "ADD_OVERLAY",
        payload: {
          ...overlay,
          id: newId,
          keyframes: overlay.keyframes.map((k) => ({ ...k })),
          effects: overlay.effects.map((fx) => ({ ...fx })),
          locked: false,
        },
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInput) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "Enter") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("gifalchemy:export-request"));
          return;
        }
      }

      if (e.key === " ") {
        e.preventDefault();
        dispatch({ type: "SET_PLAYING", payload: !state.isPlaying });
        return;
      }

      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        dispatch({ type: "SET_PLAYING", payload: false });
        dispatch({ type: "SET_FRAME", payload: 0 });
        return;
      }

      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        if (state.frames.length === 0) return;
        e.preventDefault();
        const delta = e.key === "ArrowRight" ? 1 : -1;
        const next = Math.max(
          0,
          Math.min(state.frames.length - 1, state.currentFrameIndex + delta)
        );
        dispatch({ type: "SET_PLAYING", payload: false });
        dispatch({ type: "SET_FRAME", payload: next });
        return;
      }

      const toolShortcut = TOOL_SHORTCUTS.find((shortcut) => shortcut.key === e.key);
      if (toolShortcut && TOOLS_ACTIVE.includes(toolShortcut.tool)) {
        e.preventDefault();
        dispatch({
          type: "SET_TOOL",
          payload: state.activeTool === toolShortcut.tool ? null : toolShortcut.tool,
        });
        return;
      }

      if (e.key === "Escape" && state.selectedOverlayId) {
        e.preventDefault();
        dispatch({ type: "SELECT_OVERLAY", payload: null });
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selectedOverlayId) {
          const selected = state.overlays.find((o) => o.id === state.selectedOverlayId);
          if (selected?.locked) return;
          e.preventDefault();
          dispatch({ type: "REMOVE_OVERLAY", payload: state.selectedOverlayId });
        }
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          if (e.shiftKey) {
            if (canRedo) redo();
          } else {
            if (canUndo) undo();
          }
          return;
        }
        if (e.key === "y") {
          e.preventDefault();
          if (canRedo) redo();
          return;
        }
        if (e.key.toLowerCase() === "d") {
          const selected = state.overlays.find((o) => o.id === state.selectedOverlayId);
          if (selected?.locked) return;
          e.preventDefault();
          duplicateSelected();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    state.selectedOverlayId,
    state.overlays,
    state.isPlaying,
    state.frames.length,
    state.currentFrameIndex,
    state.activeTool,
    canUndo,
    canRedo,
    dispatch,
    undo,
    redo,
  ]);
}
