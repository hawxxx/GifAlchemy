import type {
  GifFrame,
  GifMetadata,
  ProcessingProgress,
  ProcessingResult,
} from "@/core/domain/gif-types";
import type { Overlay } from "@/core/domain/project";

export interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "gif" | "mp4" | "webm" | "apng";
  signal?: AbortSignal;
  /** First frame index (inclusive) for trim. When set with trimEnd, only this range is exported. */
  trimStart?: number;
  /** Last frame index (inclusive) for trim. */
  trimEnd?: number;
}

export interface IGifProcessor {
  readonly isReady: boolean;
  initialize(): Promise<void>;
  decode(file: File): Promise<{ frames: GifFrame[]; metadata: GifMetadata }>;
  resize(file: File, width: number, height: number): Promise<ProcessingResult>;
  transform(file: File, options: TransformOptions): Promise<ProcessingResult>;
  addTextOverlays(
    file: File,
    overlays: Overlay[],
    frameCount: number,
    options?: TransformOptions
  ): Promise<ProcessingResult>;
  onProgress(callback: (progress: ProcessingProgress) => void): void;
  dispose(): void;
}
