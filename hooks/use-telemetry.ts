"use client";

import { useCallback, useEffect, useState } from "react";

const TELEMETRY_KEY = "gifalchemy.telemetry.opt_in";

export interface ExportFailureTelemetry {
  message: string;
  overlaysCount: number;
  frameCount: number;
  format: string;
}

export interface ExportPerfTelemetry {
  decodeMs: number;
  compositeMs: number;
  encodeMs: number;
  totalMs: number;
  overlaysCount: number;
  frameCount: number;
  format: string;
}

type TelemetryEventName = "export_failure" | "export_perf";

function readTelemetryPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(TELEMETRY_KEY) === "1";
}

export function useTelemetry() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(readTelemetryPreference());
  }, []);

  const setTelemetryEnabled = useCallback((next: boolean) => {
    setEnabled(next);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TELEMETRY_KEY, next ? "1" : "0");
    window.dispatchEvent(
      new CustomEvent("gifalchemy:telemetry-consent-changed", {
        detail: { enabled: next },
      })
    );
  }, []);

  const emit = useCallback(
    (event: TelemetryEventName, payload: ExportFailureTelemetry | ExportPerfTelemetry) => {
      if (!enabled || typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent("gifalchemy:telemetry-event", {
          detail: {
            event,
            payload,
            timestamp: Date.now(),
          },
        })
      );
    },
    [enabled]
  );

  const trackExportFailure = useCallback(
    (payload: ExportFailureTelemetry) => emit("export_failure", payload),
    [emit]
  );

  const trackExportPerf = useCallback(
    (payload: ExportPerfTelemetry) => emit("export_perf", payload),
    [emit]
  );

  return {
    telemetryEnabled: enabled,
    setTelemetryEnabled,
    trackExportFailure,
    trackExportPerf,
  };
}
