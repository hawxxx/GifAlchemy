"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEditor } from "./use-editor";

export function usePlayback() {
  const { state, dispatch } = useEditor();
  const { isPlaying, playbackRate = 1, trimStart = 0, trimEnd = 0 } = state;

  // Refs so the RAF callback always sees the latest values without re-subscribing
  const isPlayingRef = useRef(isPlaying);
  const framesRef = useRef(state.frames);
  const currentIdxRef = useRef(state.currentFrameIndex);
  const playbackRateRef = useRef(playbackRate);
  const trimStartRef = useRef(trimStart);
  const trimEndRef = useRef(trimEnd);
  const rafRef = useRef<number | null>(null);
  const lastAdvanceRef = useRef<number | null>(null);

  isPlayingRef.current = isPlaying;
  framesRef.current = state.frames;
  currentIdxRef.current = state.currentFrameIndex;
  playbackRateRef.current = playbackRate;
  trimStartRef.current = trimStart;
  trimEndRef.current = trimEnd;

  useEffect(() => {
    if (!isPlaying || state.frames.length === 0) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastAdvanceRef.current = null;
      return;
    }

    const tick = (now: number) => {
      if (!isPlayingRef.current) {
        rafRef.current = null;
        return;
      }

      if (lastAdvanceRef.current === null) {
        lastAdvanceRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const elapsed = now - lastAdvanceRef.current;
      const idx = currentIdxRef.current;
      const frames = framesRef.current;
      if (frames.length === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const rate = Math.max(0.25, playbackRateRef.current);
      const maxIdx = frames.length - 1;
      const start = Math.max(0, Math.min(maxIdx, trimStartRef.current ?? 0));
      const end = Math.max(start, Math.min(maxIdx, trimEndRef.current ?? maxIdx));
      if (idx < start || idx > end) {
        lastAdvanceRef.current = now;
        dispatch({ type: "SET_FRAME", payload: start });
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      // Use the per-frame delay from the decoded GIF metadata, scaled by playback rate.
      // 10 ms floor matches browser behaviour; never zero to avoid busy-loop.
      const delay = Math.max(frames[idx]?.delay ?? 100, 10) / rate;

      if (elapsed >= delay) {
        lastAdvanceRef.current = now;
        const next = idx >= end ? start : idx + 1;
        dispatch({ type: "SET_FRAME", payload: next });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, state.frames.length, dispatch]);

  const togglePlay = useCallback(() => {
    dispatch({ type: "SET_PLAYING", payload: !isPlayingRef.current });
  }, [dispatch]);

  const stop = useCallback(() => {
    dispatch({ type: "SET_PLAYING", payload: false });
    dispatch({ type: "SET_FRAME", payload: 0 });
  }, [dispatch]);

  return { isPlaying, togglePlay, stop };
}
