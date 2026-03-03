"use client";

import { useEffect, useMemo, useState } from "react";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTelemetry } from "@/hooks/use-telemetry";

interface DecodeProfile {
  decodeMs: number;
  frameCount: number;
  width: number;
  height: number;
  at: number;
}

interface ExportProfile {
  decodeMs: number;
  compositeMs: number;
  encodeMs: number;
  totalMs: number;
  overlaysCount: number;
  frameCount: number;
  format: string;
  at: number;
}

function formatMs(ms: number): string {
  return `${Math.max(0, ms).toFixed(1)} ms`;
}

export function PerformanceProfilingPanel() {
  const [decodeProfile, setDecodeProfile] = useState<DecodeProfile | null>(null);
  const [exportProfile, setExportProfile] = useState<ExportProfile | null>(null);
  const { telemetryEnabled, setTelemetryEnabled } = useTelemetry();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onDecode = (event: Event) => {
      const custom = event as CustomEvent<DecodeProfile>;
      setDecodeProfile(custom.detail);
    };

    const onExport = (event: Event) => {
      const custom = event as CustomEvent<ExportProfile>;
      setExportProfile(custom.detail);
    };

    window.addEventListener("gifalchemy:decode-profile", onDecode as EventListener);
    window.addEventListener("gifalchemy:export-profile", onExport as EventListener);

    return () => {
      window.removeEventListener("gifalchemy:decode-profile", onDecode as EventListener);
      window.removeEventListener("gifalchemy:export-profile", onExport as EventListener);
    };
  }, []);

  const totalKnownMs = useMemo(() => {
    if (!exportProfile) return 0;
    return exportProfile.decodeMs + exportProfile.compositeMs + exportProfile.encodeMs;
  }, [exportProfile]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 rounded-lg gap-1.5 text-xs">
          <Gauge className="h-3.5 w-3.5" />
          Profiling
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Performance profiling</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <div className="flex min-w-0 w-full flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Decode (upload)</span>
            {decodeProfile ? (
              <span className="text-xs">
                {formatMs(decodeProfile.decodeMs)} · {decodeProfile.frameCount} frames · {decodeProfile.width}x{decodeProfile.height}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No upload profile yet</span>
            )}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <div className="flex min-w-0 w-full flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Export phases</span>
            {exportProfile ? (
              <span className="text-xs leading-5">
                decode {formatMs(exportProfile.decodeMs)} · composite {formatMs(exportProfile.compositeMs)} · encode {formatMs(exportProfile.encodeMs)} · total {formatMs(exportProfile.totalMs)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No export profile yet</span>
            )}
          </div>
        </DropdownMenuItem>
        {exportProfile && (
          <DropdownMenuItem disabled>
            <span className="text-[11px] text-muted-foreground">
              phase total {formatMs(totalKnownMs)} · output {exportProfile.format.toUpperCase()} · overlays {exportProfile.overlaysCount}
            </span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTelemetryEnabled(!telemetryEnabled)}>
          <div className="flex w-full items-center justify-between gap-3 text-xs">
            <span>Telemetry (opt-in)</span>
            <span className={telemetryEnabled ? "text-emerald-600" : "text-muted-foreground"}>
              {telemetryEnabled ? "On" : "Off"}
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
