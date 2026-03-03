import type { IGifProcessor, TransformOptions } from "@/core/application/processors/gif-processor.port";
import type { GifFrame, GifMetadata, ProcessingResult } from "@/core/domain/gif-types";
import type { OutputSettings, Overlay } from "@/core/domain/project";

export async function decodeGif(
  processor: IGifProcessor,
  file: File
): Promise<{ frames: GifFrame[]; metadata: GifMetadata }> {
  if (!processor.isReady) {
    await processor.initialize();
  }
  return processor.decode(file);
}

export async function exportGif(
  processor: IGifProcessor,
  file: File,
  outputSettings: OutputSettings,
  frameCount: number,
  trimStart: number,
  trimEnd: number,
  signal?: AbortSignal
): Promise<ProcessingResult> {
  if (!processor.isReady) {
    await processor.initialize();
  }
  const options: TransformOptions = {
    width: outputSettings.width,
    height: outputSettings.height,
    quality: outputSettings.quality,
    format: outputSettings.format,
    signal,
    trimStart: trimStart > 0 || trimEnd < frameCount - 1 ? trimStart : undefined,
    trimEnd: trimStart > 0 || trimEnd < frameCount - 1 ? trimEnd : undefined,
  };
  return processor.transform(file, options);
}

export async function exportGifWithOverlays(
  processor: IGifProcessor,
  file: File,
  outputSettings: OutputSettings,
  overlays: Overlay[],
  frameCount: number,
  trimStart: number,
  trimEnd: number,
  signal?: AbortSignal
): Promise<ProcessingResult> {
  if (!processor.isReady) {
    await processor.initialize();
  }
  const options: TransformOptions = {
    width: outputSettings.width,
    height: outputSettings.height,
    quality: outputSettings.quality,
    format: outputSettings.format,
    signal,
    trimStart: trimStart > 0 || trimEnd < frameCount - 1 ? trimStart : undefined,
    trimEnd: trimStart > 0 || trimEnd < frameCount - 1 ? trimEnd : undefined,
  };
  return processor.addTextOverlays(file, overlays, frameCount, options);
}

export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
