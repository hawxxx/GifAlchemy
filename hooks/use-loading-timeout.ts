"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "./use-editor";

const LOADING_TIMEOUT_MS = 30_000;

/**
 * If the editor stays in "loading" for too long (e.g. decode or restore hangs),
 * reset so the user can retry instead of being stuck on "Preparing frames".
 */
export function useLoadingTimeout() {
  const { state, dispatch } = useEditor();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (state.status !== "loading") {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      dispatch({
        type: "UPLOAD_ERROR",
        payload: "Loading took too long. The file may be very large or the connection slow. Try again or use a smaller file.",
      });
    }, LOADING_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [state.status, dispatch]);
}
