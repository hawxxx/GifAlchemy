"use client";

import { useCallback, useRef } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_FILE_SIZE, SUPPORTED_ACCEPT, ERROR_MESSAGES } from "@/lib/constants";

export type UploadZoneStatus = "idle" | "dragover" | "error";

export interface UploadZoneProps {
  onFileAccepted: (file: File) => void;
  onError: (message: string) => void;
  status?: UploadZoneStatus;
  errorMessage?: string | null;
  disabled?: boolean;
  className?: string;
}

export function UploadZone({
  onFileAccepted,
  onError,
  status = "idle",
  errorMessage = null,
  disabled = false,
  className,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

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
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors duration-120 ease-out min-h-[280px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        status === "dragover" && "border-primary bg-accent/30",
        status === "error" && "border-destructive/50 bg-destructive/5",
        status === "idle" && "border-border/50 hover:border-muted-foreground/30 hover:bg-muted/30",
        disabled && "pointer-events-none opacity-50",
        className
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
      <Upload className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-center text-muted-foreground px-4">
        {errorMessage || "Drop a GIF or click to upload"}
      </p>
    </div>
  );
}
