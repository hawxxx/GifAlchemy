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
        "relative isolate overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(19,24,31,0.96),rgba(11,14,19,0.98))] p-3 shadow-[0_24px_72px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200 ease-out",
        effectiveStatus === "dragover" && "border-primary/50 shadow-[0_28px_80px_rgba(10,16,28,0.56),0_0_0_1px_rgba(91,140,255,0.12)_inset]",
        effectiveStatus === "error" && "border-destructive/40",
        disabled && "opacity-60",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-200 ease-out",
          effectiveStatus === "dragover" ? "opacity-100" : "opacity-70"
        )}
        style={{
          background:
            effectiveStatus === "error"
              ? "radial-gradient(circle at 50% 0%, rgba(225,118,118,0.14), transparent 52%)"
              : "radial-gradient(circle at 50% 0%, rgba(91,140,255,0.14), transparent 54%)",
        }}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-5 rounded-[22px] border border-dashed px-6 py-10 text-center outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          effectiveStatus === "dragover" &&
            "scale-[1.01] border-primary/60 bg-[rgba(91,140,255,0.09)]",
          effectiveStatus === "error" && "border-destructive/50 bg-destructive/5",
          effectiveStatus === "idle" && "border-white/10 bg-white/[0.025] hover:border-white/16 hover:bg-white/[0.035]",
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
        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_32px_rgba(0,0,0,0.2)] transition-transform duration-200 ease-out">
          <Upload className="h-7 w-7 text-white/85" />
        </div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/65">
            <Sparkles className="h-3.5 w-3.5" />
            Drag, drop, or browse
          </div>
          <div className="space-y-1">
            <p className="text-[22px] font-semibold tracking-[-0.03em] text-white/96">
              Import motion media
            </p>
            <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
              Drop a GIF, MP4, WebM, or PNG to start editing. Large uploads and remote files stay in the browser.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1">GIF</span>
          <span className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1">WebM</span>
          <span className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1">MP4</span>
          <span className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1">PNG</span>
          <span className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1">Max 50 MB</span>
        </div>
        <p className="text-sm text-center text-muted-foreground px-4 min-h-[20px]">
          {errorMessage || "Click anywhere in this surface to browse local files."}
        </p>
      </div>
      <div className="relative mt-3 rounded-[20px] border border-white/8 bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/52">
          <Link2 className="h-3.5 w-3.5" />
          Import from URL
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
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
            className="h-10 rounded-[14px] border-white/10 bg-black/20 text-white placeholder:text-white/32"
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 min-w-[140px] rounded-[14px] border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
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
                Open URL
                <ArrowUpRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
