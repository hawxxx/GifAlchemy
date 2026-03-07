"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Link2, LoaderCircle, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MAX_FILE_SIZE, SUPPORTED_ACCEPT, ERROR_MESSAGES } from "@/lib/constants";

export type UploadZoneStatus = "idle" | "dragover" | "error";

export interface UploadZoneProps {
  onFileAccepted: (file: File) => void;
  onUrlAccepted?: (url: string) => Promise<void> | void;
  onError: (message: string) => void;
  status?: UploadZoneStatus;
  errorMessage?: string | null;
  disabled?: boolean;
  className?: string;
}

export function UploadZone({
  onFileAccepted,
  onUrlAccepted,
  onError,
  status = "idle",
  errorMessage = null,
  disabled = false,
  className,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);

  const validate = useCallback(
    (file: File): string | null => {
      if (file.size > MAX_FILE_SIZE) return ERROR_MESSAGES.FILE_TOO_LARGE;
      const accepted = SUPPORTED_ACCEPT.split(",").map((s) => s.trim());
      if (!accepted.includes(file.type) && !file.name.match(/\.(gif|mp4|webm|png)$/i)) {
        return ERROR_MESSAGES.UNSUPPORTED_TYPE;
      }
      return null;
    },
    []
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length || disabled) return;
      const file = files[0];
      const err = validate(file);
      if (err) {
        onError(err);
        return;
      }
      onFileAccepted(file);
    },
    [disabled, validate, onError, onFileAccepted]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragActive(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const canSubmitUrl = useMemo(() => {
    return Boolean(onUrlAccepted) && urlValue.trim().length > 0 && !disabled && !isSubmittingUrl;
  }, [disabled, isSubmittingUrl, onUrlAccepted, urlValue]);

  const handleUrlSubmit = useCallback(async () => {
    if (!onUrlAccepted || !canSubmitUrl) return;
    try {
      setIsSubmittingUrl(true);
      await onUrlAccepted(urlValue.trim());
      setUrlValue("");
    } catch {
      // Parent dispatches the concrete error state.
    } finally {
      setIsSubmittingUrl(false);
    }
  }, [canSubmitUrl, onUrlAccepted, urlValue]);

  const effectiveStatus: UploadZoneStatus =
    status === "error" ? "error" : isDragActive ? "dragover" : status;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#0d121a] p-4 shadow-[0_48px_100px_-20px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
        effectiveStatus === "dragover" && "border-primary/60 scale-[1.02] shadow-[0_64px_120px_-20px_rgba(var(--primary-rgb),0.3),0_0_0_1px_rgba(var(--primary-rgb),0.2)_inset]",
        effectiveStatus === "error" && "border-destructive/40 shadow-[0_48px_100px_-20px_rgba(239,68,68,0.2)]",
        disabled && "opacity-60 grayscale-[0.5]",
        className
      )}
    >
      {/* Animated Mesh Background for "Wow" factor */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[#0d121a]">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_0%,var(--primary),transparent_70%)] animate-pulse" />
        <div className="absolute inset-0 opacity-5 transition-opacity duration-1000 group-hover:opacity-10" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-6 rounded-[24px] border border-white/[0.05] px-8 py-12 text-center outline-none transition-all duration-500 ease-out focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d121a]",
          effectiveStatus === "dragover" &&
            "bg-primary/[0.08] border-primary/40",
          effectiveStatus === "error" && "border-destructive/30 bg-destructive/[0.03]",
          effectiveStatus === "idle" && "bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.1] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)]",
          disabled && "pointer-events-none"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={SUPPORTED_ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        
        {/* Modern Icon Plate */}
        <div className="relative group/icon">
          <div className="absolute inset-0 rounded-[22px] bg-primary/20 blur-xl transition-transform duration-500 group-hover/icon:scale-150" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_24px_48px_-12px_rgba(0,0,0,0.6)] transition-all duration-500 group-hover/icon:rotate-3 group-hover/icon:scale-110">
            <Upload className="h-9 w-9 text-white group-hover:text-primary transition-colors duration-300" />
          </div>
        </div>

        <div className="space-y-4 max-w-sm">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]">
            <Sparkles className="h-3.5 w-3.5" />
            Ready for takeoff
          </div>
          <div className="space-y-2">
            <h2 className="text-[28px] font-black tracking-tight text-white/95 leading-tight">
              Craft your <span className="text-primary italic">vision</span>
            </h2>
            <p className="text-sm leading-relaxed text-white/40 font-medium">
              Import a <span className="text-white/60">GIF, MP4, WebM, or PNG</span> to start transforming your motion media with ultra-premium effects.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 text-[10px] font-black tracking-widest text-white/20">
          {["GIF", "WebM", "MP4", "PNG"].map(fmt => (
            <span key={fmt} className="rounded-lg border border-white/[0.03] bg-white/[0.02] px-3 py-1.5 transition-colors hover:border-white/10 hover:text-white/40">
              {fmt}
            </span>
          ))}
          <span className="h-1 w-1 rounded-full bg-white/10 mx-1" />
          <span className="text-primary/40">MAX 50 MB</span>
        </div>

        <p className="absolute bottom-6 text-[10px] font-black uppercase tracking-[0.15em] text-white/15">
          {errorMessage || "Local files stay in the browser."}
        </p>
      </div>
      <div className="relative mt-4 overflow-hidden rounded-[24px] border border-white/[0.05] bg-black/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300 hover:border-white/[0.08] hover:bg-black/60">
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/25">
            <Link2 className="h-3.5 w-3.5 text-primary/40" />
            Import from URL
          </div>
          <div className="h-1 flex-1 mx-4 border-t border-white/[0.03]" />
          <div className="text-[9px] font-bold text-white/10 uppercase tracking-widest">
            Remote Assets
          </div>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Input
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleUrlSubmit();
              }
            }}
            placeholder="https://example.com/clip.gif"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={disabled || isSubmittingUrl || !onUrlAccepted}
            className="h-11 rounded-full border-white/[0.05] bg-white/[0.02] px-6 text-sm font-medium tracking-tight text-white placeholder:text-white/10 transition-all duration-300 focus:bg-white/[0.05] focus:ring-1 focus:ring-primary/30"
          />
          <Button
            type="button"
            variant="default"
            className="group/btn h-11 min-w-[160px] rounded-full bg-primary/20 border border-primary/30 text-[11px] font-black uppercase tracking-widest text-primary transition-all duration-500 hover:bg-primary hover:text-white hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] active:scale-95"
            onClick={() => void handleUrlSubmit()}
            disabled={!canSubmitUrl}
          >
            {isSubmittingUrl ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Fetching
              </>
            ) : (
              <>
                Open Asset
                <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
