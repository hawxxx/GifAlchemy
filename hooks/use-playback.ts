"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEditor } from "./use-editor";

export function usePlayback() {
  const { state, dispatch } = useEditor();
  const { isPlaying } = state;

  // Refs so the RAF callback always sees the latest values without re-subscribing
  const isPlayingRef = useRef(isPlaying);
  const framesRef = useRef(state.frames);
  const currentIdxRef = useRef(state.currentFrameIndex);
  const rafRef = useRef<number | null>(null);
  const lastAdvanceRef = useRef<number | null>(null);

  isPlayingRef.current = isPlaying;
  framesRef.current = state.frames;
  currentIdxRef.current = state.currentFrameIndex;

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
      // Use the per-frame delay from the decoded GIF metadata.
      // 10 ms floor matches browser behaviour; never zero to avoid busy-loop.
      const delay = Math.max(frames[idx]?.delay ?? 100, 10);

      if (elapsed >= delay) {
        lastAdvanceRef.current = now;
        dispatch({ type: "SET_FRAME", payload: (idx + 1) % frames.length });
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
