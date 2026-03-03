"use client";

import { useCallback } from "react";
import {
  createTextOverlay,
  updateOverlay as updateOverlayCmd,
  addKeyframe as addKeyframeCmd,
  bakeEffectToKeyframes,
  clearEffect as clearEffectCmd,
} from "@/core/application/commands/overlay-commands";
import type { Overlay, AnimationPresetType } from "@/core/domain/project";
import { useEditor } from "./use-editor";

export function useOverlays() {
  const { state, dispatch } = useEditor();
  const { overlays, frames, selectedOverlayId } = state;
  const frameCount = frames.length;

  const addOverlay = useCallback(() => {
    const overlay = createTextOverlay(frameCount);
    dispatch({ type: "ADD_OVERLAY", payload: overlay });
    // SELECT_OVERLAY dispatched automatically in reducer on ADD_OVERLAY
  }, [frameCount, dispatch]);

  const selectOverlay = useCallback(
    (id: string | null) => {
      dispatch({ type: "SELECT_OVERLAY", payload: id });
    },
    [dispatch]
  );

  const updateOverlay = useCallback(
    (
      id: string,
      updates: Partial<
        Pick<
          Overlay,
          | "content"
          | "fontFamily"
          | "fontSize"
          | "fontWeight"
          | "fontStyle"
          | "color"
          | "strokeWidth"
          | "strokeColor"
          | "keyframes"
          | "effects"
          | "visible"
          | "locked"
        >
      >
    ) => {
      const current = overlays.find((o) => o.id === id);
      if (!current) return;

      const isLocked = current.locked === true;
      if (isLocked) {
        const editableKeys = Object.keys(updates).filter(
          (key) => key !== "locked" && key !== "visible"
        );
        if (editableKeys.length > 0) return;
      }

      const next = updateOverlayCmd(overlays, id, updates);
      const updated = next.find((o) => o.id === id);
      if (updated) dispatch({ type: "UPDATE_OVERLAY", payload: { id, updates: updated } });
    },
    [overlays, dispatch]
  );

  const removeOverlay = useCallback(
    (id: string) => {
      const overlay = overlays.find((o) => o.id === id);
      if (overlay?.locked) return;
      dispatch({ type: "REMOVE_OVERLAY", payload: id });
    },
    [dispatch, overlays]
  );

  const duplicateOverlay = useCallback(
    (id: string) => {
      const overlay = overlays.find((o) => o.id === id);
      if (!overlay) return;
      const newId = `ol_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const clone: Overlay = {
        ...overlay,
        id: newId,
        keyframes: overlay.keyframes.map((k) => ({ ...k })),
        effects: overlay.effects.map((e) => ({ ...e })),
        locked: false,
      };
      dispatch({ type: "ADD_OVERLAY", payload: clone });
    },
    [overlays, dispatch]
  );

  const reorderOverlays = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      const fromIndex = overlays.findIndex((o) => o.id === fromId);
      const toIndex = overlays.findIndex((o) => o.id === toId);
      if (fromIndex === -1 || toIndex === -1) return;
      const next = [...overlays];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      dispatch({ type: "SET_OVERLAYS", payload: next });
    },
    [overlays, dispatch]
  );

  const addKeyframe = useCallback(
    (overlayId: string, frameIndex: number) => {
      const overlay = overlays.find((o) => o.id === overlayId);
      if (!overlay || overlay.locked) return;
      const updated = addKeyframeCmd(overlay, frameIndex);
      dispatch({
        type: "UPDATE_OVERLAY",
        payload: { id: overlayId, updates: { keyframes: updated.keyframes } },
      });
    },
    [overlays, dispatch]
  );

  /**
   * Shift all keyframes of an overlay by (dx, dy) in normalised [0..1] space.
   * Used during drag so the text moves consistently across all frames.
   */
  const shiftPosition = useCallback(
    (overlayId: string, dx: number, dy: number) => {
      const overlay = overlays.find((o) => o.id === overlayId);
      if (!overlay || overlay.locked) return;
      const keyframes = overlay.keyframes.map((k) => ({
        ...k,
        x: Math.max(0, Math.min(1, k.x + dx)),
        y: Math.max(0, Math.min(1, k.y + dy)),
      }));
      dispatch({ type: "UPDATE_OVERLAY", payload: { id: overlayId, updates: { keyframes } } });
    },
    [overlays, dispatch]
  );

  /**
   * Set the (x, y) position of an overlay at a specific frame only.
   * Creates or updates the keyframe at that frame index.
   */
  const setPosition = useCallback(
    (overlayId: string, frameIndex: number, x: number, y: number) => {
      const overlay = overlays.find((o) => o.id === overlayId);
      if (!overlay || overlay.locked) return;

      const existing = overlay.keyframes.find((k) => k.frameIndex === frameIndex);
      if (existing) {
        const keyframes = overlay.keyframes.map((k) =>
          k.frameIndex === frameIndex ? { ...k, x, y } : k
        );
        dispatch({ type: "UPDATE_OVERLAY", payload: { id: overlayId, updates: { keyframes } } });
      } else {
        const withNew = addKeyframeCmd(overlay, frameIndex);
        const keyframes = withNew.keyframes.map((k) =>
          k.frameIndex === frameIndex ? { ...k, x, y } : k
        );
        dispatch({ type: "UPDATE_OVERLAY", payload: { id: overlayId, updates: { keyframes } } });
      }
    },
    [overlays, dispatch]
  );

  const bakeEffect = useCallback(
    (
      overlayId: string,
      effectType: AnimationPresetType,
      startFrame: number,
      endFrame: number
    ) => {
      const overlay = overlays.find((o) => o.id === overlayId);
      if (!overlay || overlay.locked) return;
      const updated = bakeEffectToKeyframes(overlay, effectType, startFrame, endFrame);
      dispatch({
        type: "UPDATE_OVERLAY",
        payload: {
          id: overlayId,
          updates: { keyframes: updated.keyframes, effects: updated.effects },
        },
      });
    },
    [overlays, dispatch]
  );

  const clearEffect = useCallback(
    (overlayId: string) => {
      const overlay = overlays.find((o) => o.id === overlayId);
      if (!overlay || overlay.locked) return;
      const updated = clearEffectCmd(overlay, frameCount);
      dispatch({
        type: "UPDATE_OVERLAY",
        payload: {
          id: overlayId,
          updates: { keyframes: updated.keyframes, effects: updated.effects },
        },
      });
    },
    [overlays, frameCount, dispatch]
  );

  return {
    overlays,
    selectedOverlayId,
    addOverlay,
    selectOverlay,
    updateOverlay,
    removeOverlay,
    duplicateOverlay,
    reorderOverlays,
    addKeyframe,
    setPosition,
    shiftPosition,
    bakeEffect,
    clearEffect,
  };
}
