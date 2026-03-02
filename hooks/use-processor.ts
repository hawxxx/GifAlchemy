"use client";

import { useState, useCallback, useEffect } from "react";
import type { IGifProcessor } from "@/core/application/processors/gif-processor.port";

export interface UseProcessorResult {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
}

export function useProcessor(processor: IGifProcessor | null): UseProcessorResult {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    if (!processor) return;
    if (processor.isReady) {
      setIsReady(true);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await processor.initialize();
      setIsReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Processing engine failed to load.");
    } finally {
      setIsLoading(false);
    }
  }, [processor]);

  useEffect(() => {
    if (processor?.isReady) setIsReady(true);
  }, [processor]);

  return { isReady, isLoading, error, initialize };
}
