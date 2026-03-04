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

type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";
type DistributeMode = "horizontal" | "vertical";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function interpolatePosition(overlay: Overlay, frameIndex: number): { x: number; y: number } {
  const kfs = [...overlay.keyframes].sort((a, b) => a.frameIndex - b.frameIndex);
  if (kfs.length === 0) return { x: 0.5, y: 0.5 };
  if (frameIndex <= kfs[0].frameIndex) return { x: kfs[0].x, y: kfs[0].y };
  if (frameIndex >= kfs[kfs.length - 1].frameIndex) {
    const last = kfs[kfs.length - 1];
    return { x: last.x, y: last.y };
  }

  const prev = [...kfs].reverse().find((k) => k.frameIndex <= frameIndex) ?? kfs[0];
  const next = kfs.find((k) => k.frameIndex > frameIndex) ?? kfs[kfs.length - 1];
  const span = Math.max(1, next.frameIndex - prev.frameIndex);
  const t = (frameIndex - prev.frameIndex) / span;
  return {
    x: prev.x + (next.x - prev.x) * t,
    y: prev.y + (next.y - prev.y) * t,
  };
}

export function useOverlays() {
  const { state, dispatch } = useEditor();
  const { overlays, frames, selectedOverlayId, selectedOverlayIds, metadata, currentFrameIndex } = state;
  const frameCount = frames.length;

  const getSelectionIds = useCallback(() => {
    if (selectedOverlayIds.length > 0) return selectedOverlayIds;
    return selectedOverlayId ? [selectedOverlayId] : [];
  }, [selectedOverlayId, selectedOverlayIds]);

  const applyDeltaToIds = useCallback(
    (ids: string[], dx: number, dy: number) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      const next = overlays.map((overlay) => {
        if (!idSet.has(overlay.id) || overlay.locked) return overlay;
        return {
          ...overlay,
          keyframes: overlay.keyframes.map((k) => ({
            ...k,
            x: clamp01(k.x + dx),
            y: clamp01(k.y + dy),
          })),
        };
      });
      dispatch({ type: "SET_OVERLAYS", payload: next });
    },
    [overlays, dispatch]
  );

  const addOverlay = useCallback((
    overrides?: Partial<
      Pick<
        Overlay,
        | "content"
        | "fontFamily"
        | "fontSize"
        | "color"
        | "textAlign"
        | "strokeWidth"
        | "strokeColor"
        | "fontWeight"
        | "fontStyle"
        | "visible"
        | "locked"
        | "inFrame"
        | "outFrame"
      >
    >,
    position?: { x: number; y: number }
  ) => {
    const overlay = createTextOverlay(frameCount, overrides);
    overlay.inFrame = 0;
    overlay.outFrame = Math.max(0, frameCount - 1);
    if (position) {
      overlay.keyframes = overlay.keyframes.map((k) => ({ ...k, x: position.x, y: position.y }));
    }
    dispatch({ type: "ADD_OVERLAY", payload: overlay });
    return overlay.id;
  }, [frameCount, dispatch]);

  const selectOverlay = useCallback(
    (id: string | null) => {
      dispatch({ type: "SELECT_OVERLAY", payload: id });
    },
    [dispatch]
  );

  const setSelectedOverlays = useCallback(
    (ids: string[]) => {
      dispatch({ type: "SET_SELECTED_OVERLAYS", payload: ids });
    },
    [dispatch]
  );

  const toggleOverlaySelection = useCallback(
    (id: string) => {
      const exists = selectedOverlayIds.includes(id);
      const next = exists ? selectedOverlayIds.filter((v) => v !== id) : [...selectedOverlayIds, id];
      dispatch({ type: "SET_SELECTED_OVERLAYS", payload: next });
    },
    [selectedOverlayIds, dispatch]
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
          | "textAlign"
          | "color"
          | "strokeWidth"
          | "strokeColor"
          | "keyframes"
          | "effects"
          | "visible"
          | "locked"
          | "inFrame"
          | "outFrame"
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
      const offsetX = metadata?.width ? 16 / metadata.width : 0.03;
      const offsetY = metadata?.height ? 16 / metadata.height : 0.03;
      const clone: Overlay = {
        ...overlay,
        id: newId,
        keyframes: overlay.keyframes.map((k) => ({
          ...k,
          x: clamp01(k.x + offsetX),
          y: clamp01(k.y + offsetY),
        })),
        effects: overlay.effects.map((e) => ({ ...e })),
        locked: false,
        inFrame: overlay.inFrame ?? 0,
        outFrame: overlay.outFrame ?? Math.max(0, frameCount - 1),
      };
      dispatch({ type: "ADD_OVERLAY", payload: clone });
    },
    [overlays, metadata, frameCount, dispatch]
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

  const shiftPosition = useCallback(
    (overlayId: string, dx: number, dy: number) => {
      const overlay = overlays.find((o) => o.id === overlayId);
      if (!overlay || overlay.locked) return;

      const groupIds = overlay.groupId
        ? overlays.filter((o) => o.groupId === overlay.groupId).map((o) => o.id)
        : [overlayId];
      applyDeltaToIds(groupIds, dx, dy);
    },
    [overlays, applyDeltaToIds]
  );

  const shiftSelection = useCallback(
    (dx: number, dy: number) => {
      const ids = getSelectionIds();
      if (ids.length === 0) return;
      applyDeltaToIds(ids, dx, dy);
    },
    [applyDeltaToIds, getSelectionIds]
  );

  const groupSelected = useCallback(() => {
    const ids = getSelectionIds();
    if (ids.length < 2) return;
    const idSet = new Set(ids);
    const groupId = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const next = overlays.map((overlay) => {
      if (!idSet.has(overlay.id) || overlay.locked) return overlay;
      return { ...overlay, groupId };
    });
    dispatch({ type: "SET_OVERLAYS", payload: next });
  }, [overlays, dispatch, getSelectionIds]);

  const ungroupSelected = useCallback(() => {
    const ids = getSelectionIds();
    if (ids.length === 0) return;
    const groups = new Set(
      overlays.filter((overlay) => ids.includes(overlay.id)).map((overlay) => overlay.groupId).filter(Boolean)
    );
    const idSet = new Set(ids);
    const next = overlays.map((overlay) => {
      if (idSet.has(overlay.id) || (overlay.groupId && groups.has(overlay.groupId))) {
        return { ...overlay, groupId: undefined };
      }
      return overlay;
    });
    dispatch({ type: "SET_OVERLAYS", payload: next });
  }, [overlays, dispatch, getSelectionIds]);

  const setGroupLocked = useCallback((locked: boolean) => {
    const ids = getSelectionIds();
    if (ids.length === 0) return;
    const selected = overlays.filter((overlay) => ids.includes(overlay.id));
    const selectedGroups = new Set(selected.map((overlay) => overlay.groupId).filter(Boolean));
    const next = overlays.map((overlay) => {
      if (ids.includes(overlay.id) || (overlay.groupId && selectedGroups.has(overlay.groupId))) {
        return { ...overlay, locked };
      }
      return overlay;
    });
    dispatch({ type: "SET_OVERLAYS", payload: next });
  }, [overlays, dispatch, getSelectionIds]);

  const alignSelection = useCallback(
    (mode: AlignMode) => {
      const ids = getSelectionIds();
      if (ids.length < 2) return;
      const selected = overlays.filter((overlay) => ids.includes(overlay.id) && !overlay.locked);
      if (selected.length < 2) return;

      const points = selected.map((overlay) => ({
        id: overlay.id,
        ...interpolatePosition(overlay, currentFrameIndex),
      }));

      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const targetX = mode === "left" ? minX : mode === "center" ? (minX + maxX) / 2 : maxX;
      const targetY = mode === "top" ? minY : mode === "middle" ? (minY + maxY) / 2 : maxY;

      const next = overlays.map((overlay) => {
        const point = points.find((p) => p.id === overlay.id);
        if (!point) return overlay;
        const dx = mode === "left" || mode === "center" || mode === "right" ? targetX - point.x : 0;
        const dy = mode === "top" || mode === "middle" || mode === "bottom" ? targetY - point.y : 0;
        return {
          ...overlay,
          keyframes: overlay.keyframes.map((k) => ({
            ...k,
            x: clamp01(k.x + dx),
            y: clamp01(k.y + dy),
          })),
        };
      });

      dispatch({ type: "SET_OVERLAYS", payload: next });
    },
    [overlays, currentFrameIndex, dispatch, getSelectionIds]
  );

  const distributeSelection = useCallback(
    (mode: DistributeMode) => {
      const ids = getSelectionIds();
      if (ids.length < 3) return;
      const selected = overlays
        .filter((overlay) => ids.includes(overlay.id) && !overlay.locked)
        .map((overlay) => ({
          overlay,
          ...interpolatePosition(overlay, currentFrameIndex),
        }));
      if (selected.length < 3) return;

      const sorted = [...selected].sort((a, b) => (mode === "horizontal" ? a.x - b.x : a.y - b.y));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const span = mode === "horizontal" ? last.x - first.x : last.y - first.y;
      const step = span / (sorted.length - 1);

      const targetMap = new Map<string, number>();
      sorted.forEach((item, index) => {
        const target = (mode === "horizontal" ? first.x : first.y) + step * index;
        targetMap.set(item.overlay.id, target);
      });

      const next = overlays.map((overlay) => {
        const target = targetMap.get(overlay.id);
        if (target === undefined || overlay.locked) return overlay;
        const current = interpolatePosition(overlay, currentFrameIndex);
        const dx = mode === "horizontal" ? target - current.x : 0;
        const dy = mode === "vertical" ? target - current.y : 0;
        return {
          ...overlay,
          keyframes: overlay.keyframes.map((k) => ({
            ...k,
            x: clamp01(k.x + dx),
            y: clamp01(k.y + dy),
          })),
        };
      });

      dispatch({ type: "SET_OVERLAYS", payload: next });
    },
    [overlays, currentFrameIndex, dispatch, getSelectionIds]
  );

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
    selectedOverlayIds,
    addOverlay,
    selectOverlay,
    setSelectedOverlays,
    toggleOverlaySelection,
    updateOverlay,
    removeOverlay,
    duplicateOverlay,
    reorderOverlays,
    addKeyframe,
    setPosition,
    shiftPosition,
    shiftSelection,
    groupSelected,
    ungroupSelected,
    setGroupLocked,
    alignSelection,
    distributeSelection,
    bakeEffect,
    clearEffect,
  };
}
