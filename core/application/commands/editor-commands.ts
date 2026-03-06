import type { IGifProcessor, TransformOptions } from "@/core/application/processors/gif-processor.port";
import type { GifFrame, GifMetadata, ProcessingResult } from "@/core/domain/gif-types";
import type { OutputSettings, Overlay } from "@/core/domain/project";
import { ERROR_MESSAGES, MAX_FILE_SIZE, SUPPORTED_FORMATS } from "@/lib/constants";

const DECODE_TIMEOUT_MS = 30000;

function assertDecodedMedia(
  frames: GifFrame[],
  metadata: GifMetadata
): { frames: GifFrame[]; metadata: GifMetadata } {
  if (
    frames.length === 0 ||
    metadata.frameCount === 0 ||
    metadata.width <= 0 ||
    metadata.height <= 0
  ) {
    throw new Error(ERROR_MESSAGES.DECODE_EMPTY);
  }
  return { frames, metadata };
}

export async function decodeMedia(
  processor: IGifProcessor,
  file: File
): Promise<{ frames: GifFrame[]; metadata: GifMetadata }> {
  if (!processor.isReady) {
    await processor.initialize();
  }
  let timeoutId: number | null = null;
  try {
    const decoded = await Promise.race([
      processor.decode(file),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(ERROR_MESSAGES.PROCESSING_FAILED));
        }, DECODE_TIMEOUT_MS);
      }),
    ]);
    return assertDecodedMedia(decoded.frames, decoded.metadata);
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

export async function importFromUrl(
  processor: IGifProcessor,
  rawUrl: string
): Promise<{ file: File; frames: GifFrame[]; metadata: GifMetadata }> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error(ERROR_MESSAGES.INVALID_URL);
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(ERROR_MESSAGES.INVALID_URL);
  }

  let response: Response;
  try {
    response = await fetch(parsedUrl.toString());
  } catch {
    throw new Error(ERROR_MESSAGES.URL_FETCH_FAILED);
  }

  if (!response.ok) {
    throw new Error(ERROR_MESSAGES.URL_FETCH_FAILED);
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error(ERROR_MESSAGES.EMPTY_URL_RESPONSE);
  }
  if (blob.size > MAX_FILE_SIZE) {
    throw new Error(ERROR_MESSAGES.FILE_TOO_LARGE);
  }

  const pathname = parsedUrl.pathname.split("/").filter(Boolean).at(-1) ?? "";
  const contentType = blob.type || response.headers.get("content-type") || "";
  const extension = contentType.includes("webm")
    ? "webm"
    : contentType.includes("mp4")
      ? "mp4"
      : contentType.includes("png")
      ? "png"
        : "gif";
  const normalizedType = contentType.split(";")[0].trim().toLowerCase();
  const hasSupportedType = normalizedType ? SUPPORTED_FORMATS.includes(normalizedType as (typeof SUPPORTED_FORMATS)[number]) : false;
  const hasSupportedExtension = /\.(gif|mp4|webm|png)$/i.test(pathname);
  if (!hasSupportedType && !hasSupportedExtension) {
    throw new Error(ERROR_MESSAGES.UNSUPPORTED_TYPE);
  }
  const fileName = pathname || `remote-media.${extension}`;
  const file = new File([blob], fileName, {
    type: contentType || undefined,
    lastModified: Date.now(),
  });
  const { frames, metadata } = await decodeMedia(processor, file);
  return { file, frames, metadata };
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
    backgroundMode: outputSettings.backgroundMode,
    backgroundColor: outputSettings.backgroundColor,
    signal,
    trimStart: trimStart > 0 || trimEnd < frameCount - 1 ? trimStart : undefined,
    trimEnd: trimStart > 0 || trimEnd < frameCount - 1 ? trimEnd : undefined,
    cropRect: outputSettings.crop ?? undefined,
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
    backgroundMode: outputSettings.backgroundMode,
    backgroundColor: outputSettings.backgroundColor,
    signal,
    trimStart: trimStart > 0 || trimEnd < frameCount - 1 ? trimStart : undefined,
    trimEnd: trimStart > 0 || trimEnd < frameCount - 1 ? trimEnd : undefined,
    cropRect: outputSettings.crop ?? undefined,
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
