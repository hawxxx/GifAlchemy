export interface GifFrame {
  index: number;
  imageData: ImageData;
  delay: number;
  disposal: number;
}

export interface GifMetadata {
  width: number;
  height: number;
  frameCount: number;
  duration: number;
  fileSize: number;
  fileName: string;
}

export type OutputFormat = "gif" | "mp4" | "webm" | "apng";

export interface ProcessingProgress {
  phase: string;
  percent: number;
}

export interface ProcessingResult {
  blob: Blob;
  format: OutputFormat;
  width: number;
  height: number;
  sizeBytes: number;
}
