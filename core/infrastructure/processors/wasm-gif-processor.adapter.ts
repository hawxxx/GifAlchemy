import type {
  IGifProcessor,
  TransformOptions,
} from "@/core/application/processors/gif-processor.port";
import type {
  GifFrame,
  GifMetadata,
  ProcessingProgress,
  ProcessingResult,
} from "@/core/domain/gif-types";
import {
  getOverlayFrameRange,
  type Effect,
  type Overlay,
} from "@/core/domain/project";

type GifuctPatch = typeof import("gifuct-js");
const WEBM_MAX_DECODE_FRAMES = 900;
const WEBM_FALLBACK_FPS = 15;

export class WasmGifProcessorAdapter implements IGifProcessor {
  private _ready = false;
  private _progressCallback: ((p: ProcessingProgress) => void) | null = null;
  private _gifuct: GifuctPatch | null = null;

  get isReady(): boolean {
    return this._ready;
  }

  async initialize(): Promise<void> {
    if (this._ready) return;
    try {
      this._gifuct = await import("gifuct-js");
      this._ready = true;
    } catch (e) {
      throw new Error("Processing engine failed to load. Check your connection and retry.");
    }
  }

  onProgress(callback: (progress: ProcessingProgress) => void): void {
    this._progressCallback = callback;
  }

  private reportProgress(phase: string, percent: number): void {
    this._progressCallback?.({ phase, percent });
  }

  async decode(file: File, signal?: AbortSignal): Promise<{ frames: GifFrame[]; metadata: GifMetadata }> {
    if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
    if (this.isWebmSource(file)) {
      return this.decodeWebm(file, signal);
    }
    if (!this._ready || !this._gifuct) await this.initialize();
    return this.decodeGif(file, signal);
  }

  private isWebmSource(file: File): boolean {
    const type = file.type.toLowerCase();
    return type === "video/webm" || /\.webm$/i.test(file.name);
  }

  private async decodeWebm(file: File, signal?: AbortSignal): Promise<{ frames: GifFrame[]; metadata: GifMetadata }> {
    if (typeof document === "undefined") {
      throw new Error("Video decoding is only available in the browser.");
    }
    if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");

    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.src = objectUrl;

    try {
      await this.waitForVideoEvent(video, "loadedmetadata", signal);
      await this.waitForVideoEvent(video, "loadeddata", signal);

      const width = Math.max(1, video.videoWidth || 0);
      const height = Math.max(1, video.videoHeight || 0);
      const durationSec = Number.isFinite(video.duration) ? Math.max(0, video.duration) : 0;

      if (width <= 0 || height <= 0) {
        throw new Error("Could not read video dimensions.");
      }
      if (durationSec <= 0) {
        throw new Error("Could not read video duration.");
      }

      const canUseFrameCallback = typeof video.requestVideoFrameCallback === "function";
      const decoded = canUseFrameCallback
        ? await this.decodeWebmWithFrameCallback(video, width, height, durationSec, signal)
        : await this.decodeWebmWithSeeking(video, width, height, durationSec, signal);

      if (decoded.frames.length === 0) {
        throw new Error("No frames could be decoded from this WebM file.");
      }

      const metadata: GifMetadata = {
        width,
        height,
        frameCount: decoded.frames.length,
        duration: decoded.totalMs,
        fileSize: file.size,
        fileName: file.name,
      };
      return { frames: decoded.frames, metadata };
    } finally {
      video.pause();
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    }
  }

  private waitForVideoEvent(video: HTMLVideoElement, event: "loadedmetadata" | "loadeddata", signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        cleanup();
        reject(new DOMException("Export cancelled", "AbortError"));
      };
      const onError = () => {
        cleanup();
        reject(new Error("Video decoding failed. Try a different file."));
      };
      const onReady = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        signal?.removeEventListener("abort", onAbort);
        video.removeEventListener("error", onError);
        video.removeEventListener(event, onReady);
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      video.addEventListener("error", onError, { once: true });
      video.addEventListener(event, onReady, { once: true });
    });
  }

  private async decodeWebmWithFrameCallback(
    video: HTMLVideoElement,
    width: number,
    height: number,
    durationSec: number,
    signal?: AbortSignal
  ): Promise<{ frames: GifFrame[]; totalMs: number }> {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable for video decoding.");

    const frames: GifFrame[] = [];
    let lastMediaMs: number | null = null;
    let captureDone = false;
    const durationMs = Math.max(1, Math.round(durationSec * 1000));

    const finalize = (): { frames: GifFrame[]; totalMs: number } => {
      if (frames.length === 0) {
        return { frames: [], totalMs: 0 };
      }
      if (frames.length === 1) {
        frames[0] = { ...frames[0], delay: Math.max(10, durationMs) };
      } else {
        const avgDelay = Math.max(10, Math.round(durationMs / frames.length));
        const last = frames[frames.length - 1];
        frames[frames.length - 1] = { ...last, delay: avgDelay };
      }
      const totalMs = frames.reduce((sum, f) => sum + Math.max(10, f.delay), 0);
      return { frames, totalMs };
    };

    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        cleanup();
        reject(new DOMException("Export cancelled", "AbortError"));
      };
      const onError = () => {
        cleanup();
        reject(new Error("Video decoding failed. Try a different file."));
      };
      const onEnded = () => {
        captureDone = true;
        cleanup();
        resolve();
      };
      const cleanup = () => {
        signal?.removeEventListener("abort", onAbort);
        video.removeEventListener("error", onError);
        video.removeEventListener("ended", onEnded);
      };
      const capture = (_now: number, metadata: VideoFrameCallbackMetadata) => {
        if (captureDone) return;
        if (signal?.aborted) {
          onAbort();
          return;
        }
        const mediaMs = Math.max(0, Math.round(metadata.mediaTime * 1000));
        ctx.drawImage(video, 0, 0, width, height);
        const out = ctx.getImageData(0, 0, width, height);
        const delay = lastMediaMs == null ? Math.max(10, Math.round(1000 / WEBM_FALLBACK_FPS)) : Math.max(10, mediaMs - lastMediaMs);
        frames.push({ index: frames.length, imageData: out, delay, disposal: 0 });
        lastMediaMs = mediaMs;

        if (frames.length >= WEBM_MAX_DECODE_FRAMES) {
          captureDone = true;
          video.pause();
          cleanup();
          resolve();
          return;
        }
        const percent = Math.min(98, Math.round((mediaMs / durationMs) * 100));
        this.reportProgress("Decoding", percent);
        video.requestVideoFrameCallback(capture);
      };

      signal?.addEventListener("abort", onAbort, { once: true });
      video.addEventListener("error", onError, { once: true });
      video.addEventListener("ended", onEnded, { once: true });
      video.requestVideoFrameCallback(capture);
      void video.play().catch((err) => {
        cleanup();
        reject(err instanceof Error ? err : new Error("Unable to play WebM for decoding."));
      });
    });

    return finalize();
  }

  private async decodeWebmWithSeeking(
    video: HTMLVideoElement,
    width: number,
    height: number,
    durationSec: number,
    signal?: AbortSignal
  ): Promise<{ frames: GifFrame[]; totalMs: number }> {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable for video decoding.");

    const targetFrames = Math.max(
      1,
      Math.min(WEBM_MAX_DECODE_FRAMES, Math.round(durationSec * WEBM_FALLBACK_FPS))
    );
    const frames: GifFrame[] = [];
    let prevTime = 0;

    video.pause();
    for (let i = 0; i < targetFrames; i++) {
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      const time = targetFrames <= 1
        ? 0
        : (i / (targetFrames - 1)) * durationSec;
      await this.seekVideo(video, time, signal);
      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const delay = i === 0
        ? Math.max(10, Math.round(1000 / WEBM_FALLBACK_FPS))
        : Math.max(10, Math.round((time - prevTime) * 1000));
      frames.push({ index: i, imageData, delay, disposal: 0 });
      prevTime = time;
      this.reportProgress("Decoding", Math.min(98, Math.round(((i + 1) / targetFrames) * 100)));
    }

    const totalMs = frames.reduce((sum, frame) => sum + Math.max(10, frame.delay), 0);
    return { frames, totalMs };
  }

  private seekVideo(video: HTMLVideoElement, timeSec: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        cleanup();
        reject(new DOMException("Export cancelled", "AbortError"));
      };
      const onSeeked = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Failed to seek WebM while decoding."));
      };
      const cleanup = () => {
        signal?.removeEventListener("abort", onAbort);
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("error", onError);
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      video.addEventListener("seeked", onSeeked, { once: true });
      video.addEventListener("error", onError, { once: true });
      video.currentTime = Math.max(0, Math.min(timeSec, Math.max(0, video.duration || 0)));
    });
  }

  private async decodeGif(file: File, signal?: AbortSignal): Promise<{ frames: GifFrame[]; metadata: GifMetadata }> {
    const gifuct = this._gifuct!;
    const buffer = await file.arrayBuffer();
    if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
    const parsed = gifuct.parseGIF(buffer);
    const rawFrames = gifuct.decompressFrames(parsed, true);
    const width = parsed.lsd?.width ?? 0;
    const height = parsed.lsd?.height ?? 0;

    const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
    const ctx = canvas ? canvas.getContext("2d") : null;
    if (canvas) { canvas.width = width; canvas.height = height; }

    const delayMs = (ms: number) => Math.max(ms ?? 100, 10);

    type RawFrame = {
      patch?: Uint8ClampedArray;
      dims: { top: number; left: number; width: number; height: number };
      delay: number;
      disposalType: number;
      transparentIndex?: number;
    };

    const bgIndex = (parsed as { lsd?: { backgroundColorIndex?: number } }).lsd?.backgroundColorIndex ?? 0;
    const gct = (parsed as { gct?: [number, number, number][] }).gct;
    const bgRgb = gct?.[bgIndex] ?? [0, 0, 0];
    const [bgR, bgG, bgB] = bgRgb;

    // Build a background-colour ImageData for blank-frame fallback
    let backgroundImageData: ImageData | null = null;
    if (ctx && width > 0 && height > 0) {
      const bg = ctx.createImageData(width, height);
      const d = bg.data;
      for (let i = 0; i < d.length; i += 4) { d[i] = bgR; d[i + 1] = bgG; d[i + 2] = bgB; d[i + 3] = 255; }
      backgroundImageData = bg;
      // Fill canvas with background
      ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
      ctx.fillRect(0, 0, width, height);
    }

    // Temp canvas for compositing individual patches via drawImage (GPU alpha-correct)
    const patchCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
    const patchCtx = patchCanvas?.getContext("2d") ?? null;

    const result: GifFrame[] = [];
    let savedBeforePatch: ImageData | null = null;

    for (let index = 0; index < rawFrames.length; index++) {
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      const raw = rawFrames[index] as RawFrame;

      if (!ctx || !raw.patch || !raw.dims) {
        const blank = new ImageData(Math.max(width, 1), Math.max(height, 1));
        if (backgroundImageData && blank.data.length >= backgroundImageData.data.length)
          blank.data.set(backgroundImageData.data);
        result.push({ index, imageData: blank, delay: delayMs(raw.delay), disposal: 0 });
        continue;
      }

      const { top, left, width: pw, height: ph } = raw.dims;

      // ── 1. Apply previous frame's disposal method ────────────────────────────
      if (index > 0) {
        const prevRaw = rawFrames[index - 1] as RawFrame;
        const disposal = prevRaw.disposalType ?? 0;
        const p = prevRaw.dims;
        // Clamp to canvas bounds
        const cLeft = Math.max(0, p.left);
        const cTop = Math.max(0, p.top);
        const cW = Math.max(0, Math.min(p.width, width - cLeft));
        const cH = Math.max(0, Math.min(p.height, height - cTop));
        if (disposal === 2 && cW > 0 && cH > 0) {
          // Clear previous frame's rect to GIF background colour
          ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
          ctx.fillRect(cLeft, cTop, cW, cH);
        } else if (disposal === 3 && savedBeforePatch) {
          // Restore canvas to what it was before the previous patch was drawn
          ctx.putImageData(savedBeforePatch, 0, 0);
        }
        // Disposal 0 or 1 → leave canvas as-is
      }

      // ── 2. Save canvas state for disposal 3 of the next frame ────────────────
      savedBeforePatch = new ImageData(
        new Uint8ClampedArray(ctx.getImageData(0, 0, width, height).data),
        width, height
      );

      // ── 3. Composite patch via drawImage (source-over) ───────────────────────
      //   drawImage respects alpha: transparent patch pixels leave the canvas
      //   underneath visible, correctly showing the previous frame through holes.
      if (patchCanvas && patchCtx && pw > 0 && ph > 0) {
        patchCanvas.width = pw;
        patchCanvas.height = ph;
        patchCtx.putImageData(new ImageData(new Uint8ClampedArray(raw.patch), pw, ph), 0, 0);
        const drawLeft = Math.max(0, Math.min(left, width - 1));
        const drawTop = Math.max(0, Math.min(top, height - 1));
        ctx.drawImage(patchCanvas, drawLeft, drawTop);
      }

      // ── 4. Capture full composited frame; force alpha=255 for storage ─────────
      const full = ctx.getImageData(0, 0, width, height);
      const fd = full.data;
      for (let i = 3; i < fd.length; i += 4) fd[i] = 255;

      result.push({
        index,
        imageData: new ImageData(new Uint8ClampedArray(fd), width, height),
        delay: delayMs(raw.delay),
        disposal: raw.disposalType ?? 0,
      });
    }

    const totalMs = result.reduce((sum, f) => sum + f.delay, 0);
    const metadata: GifMetadata = {
      width,
      height,
      frameCount: result.length,
      duration: totalMs,
      fileSize: file.size,
      fileName: file.name,
    };
    return { frames: result, metadata };
  }

  async resize(
    file: File,
    width: number,
    height: number
  ): Promise<ProcessingResult> {
    return this.transform(file, { width, height, format: "gif" });
  }

  async transform(
    file: File,
    options: TransformOptions
  ): Promise<ProcessingResult> {
    const signal = options.signal;
    if (!this._ready || !this._gifuct) await this.initialize();
    if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
    this.reportProgress("Decoding", 5);
    const decoded = await this.decode(file, signal);
    let frames = decoded.frames;
    const metadata = decoded.metadata;
    if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
    const trimStart = options.trimStart ?? 0;
    const trimEnd = options.trimEnd ?? frames.length - 1;
    if (trimStart > 0 || trimEnd < frames.length - 1) {
      const start = Math.max(0, trimStart);
      const end = Math.min(frames.length - 1, trimEnd);
      frames = frames.slice(start, end + 1);
    }
    if (options.cropRect) {
      frames = await this.cropFramesToCanvas(frames, options.cropRect, signal);
    }
    this.reportProgress("Decoded", 25);
    const sourceW = options.cropRect ? Math.max(1, Math.round(options.cropRect.width)) : metadata.width;
    const sourceH = options.cropRect ? Math.max(1, Math.round(options.cropRect.height)) : metadata.height;
    const w = options.width ?? sourceW;
    const h = options.height ?? sourceH;
    this.reportProgress("Resizing", 35);
    const resizedFrames = await this.resizeFramesToCanvas(frames, w, h, signal);
    if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
    this.reportProgress("Encoding", 50);
    const blob = await this.encodeFramesToGif(resizedFrames, w, h, (p) =>
      this.reportProgress("Encoding", 50 + Math.round(p * 50)),
      signal
    );
    this.reportProgress("Done", 100);
    return {
      blob,
      format: options.format ?? "gif",
      width: w,
      height: h,
      sizeBytes: blob.size,
    };
  }

  private async resizeFramesToCanvas(
    frames: GifFrame[],
    width: number,
    height: number,
    signal?: AbortSignal
  ): Promise<GifFrame[]> {
    const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
    if (!canvas) return frames;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return frames;
    return frames.map((f, i) => {
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      const imgData = f.imageData;
      const sw = imgData.width;
      const sh = imgData.height;
      const temp = document.createElement("canvas");
      temp.width = sw;
      temp.height = sh;
      const tctx = temp.getContext("2d");
      if (!tctx) return f;
      tctx.putImageData(imgData, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(temp, 0, 0, sw, sh, 0, 0, width, height);
      const out = ctx.getImageData(0, 0, width, height);
      return { ...f, imageData: out };
    });
  }

  private async cropFramesToCanvas(
    frames: GifFrame[],
    cropRect: { x: number; y: number; width: number; height: number },
    signal?: AbortSignal
  ): Promise<GifFrame[]> {
    if (frames.length === 0) return frames;
    const srcW = frames[0].imageData.width;
    const srcH = frames[0].imageData.height;
    const x = Math.max(0, Math.min(srcW - 1, Math.round(cropRect.x)));
    const y = Math.max(0, Math.min(srcH - 1, Math.round(cropRect.y)));
    const w = Math.max(1, Math.min(srcW - x, Math.round(cropRect.width)));
    const h = Math.max(1, Math.min(srcH - y, Math.round(cropRect.height)));

    const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
    if (!canvas) return frames;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return frames;

    const temp = document.createElement("canvas");
    temp.width = srcW;
    temp.height = srcH;
    const tctx = temp.getContext("2d");
    if (!tctx) return frames;

    return frames.map((f) => {
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      tctx.putImageData(f.imageData, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(temp, x, y, w, h, 0, 0, w, h);
      const out = ctx.getImageData(0, 0, w, h);
      return { ...f, imageData: out };
    });
  }

  private async encodeFramesToGif(
    frames: GifFrame[],
    width: number,
    height: number,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal
  ): Promise<Blob> {
    if (typeof document === "undefined" || frames.length === 0) {
      return new Blob();
    }
    if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new Blob();
    return new Promise((resolve, reject) => {
      let gifInstance: { abort: () => void } | null = null;
      const onAbort = () => {
        gifInstance?.abort();
        reject(new DOMException("Export cancelled", "AbortError"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      import("gif.js").then((module) => {
        if (signal?.aborted) {
          signal.removeEventListener("abort", onAbort);
          reject(new DOMException("Export cancelled", "AbortError"));
          return;
        }
        const GIF = (module as { default?: unknown }).default ?? module;
        const workerScript =
          typeof window !== "undefined"
            ? `${window.location.origin}/gif.worker.js`
            : "";
        const gif = new (GIF as new (o: object) => {
          addFrame: (ctx: CanvasRenderingContext2D, opts: object) => void;
          on: (event: string, cb: (b: Blob) => void) => void;
          render: () => void;
          abort: () => void;
        })({ workers: 2, quality: 10, width, height, workerScript });
        gifInstance = gif;
        gif.on("finished", (blob: Blob) => {
          signal?.removeEventListener("abort", onAbort);
          gifInstance = null;
          onProgress?.(1);
          resolve(blob);
        });
        gif.on("abort", () => {
          signal?.removeEventListener("abort", onAbort);
          gifInstance = null;
          reject(new DOMException("Export cancelled", "AbortError"));
        });
        const total = frames.length;
        for (let i = 0; i < frames.length; i++) {
          if (signal?.aborted) {
            signal.removeEventListener("abort", onAbort);
            reject(new DOMException("Export cancelled", "AbortError"));
            return;
          }
          const f = frames[i];
          ctx.putImageData(f.imageData, 0, 0);
          const delay = f.delay < 10 ? 100 : f.delay;
          gif.addFrame(ctx, { copy: true, delay });
          if (onProgress && total > 0) onProgress((i + 1) / total);
        }
        gif.render();
      }).catch((err) => {
        signal?.removeEventListener("abort", onAbort);
        reject(err);
      });
    });
  }

  private interpolateOverlay(overlay: Overlay, frameIndex: number): { x: number; y: number; scale: number; rotation: number; opacity: number } {
    const kfs = [...overlay.keyframes].sort((a, b) => a.frameIndex - b.frameIndex);
    if (kfs.length === 0) return { x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 1 };
    if (frameIndex <= kfs[0].frameIndex) return kfs[0];
    if (frameIndex >= kfs[kfs.length - 1].frameIndex) return kfs[kfs.length - 1];
    const prev = [...kfs].reverse().find((k) => k.frameIndex <= frameIndex)!;
    const next = kfs.find((k) => k.frameIndex > frameIndex)!;
    const t = (frameIndex - prev.frameIndex) / (next.frameIndex - prev.frameIndex);
    return {
      x: prev.x + (next.x - prev.x) * t,
      y: prev.y + (next.y - prev.y) * t,
      scale: prev.scale + (next.scale - prev.scale) * t,
      rotation: prev.rotation + (next.rotation - prev.rotation) * t,
      opacity: prev.opacity + (next.opacity - prev.opacity) * t,
    };
  }

  private splitGraphemes(text: string): string[] {
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      return Array.from(segmenter.segment(text), (part) => part.segment);
    }
    return Array.from(text);
  }

  private getFrameStartTimes(frames: GifFrame[]): number[] {
    const starts: number[] = new Array(frames.length);
    let elapsed = 0;
    for (let i = 0; i < frames.length; i++) {
      starts[i] = elapsed;
      elapsed += Math.max(10, frames[i]?.delay ?? 100);
    }
    return starts;
  }

  private getTypewriterState(
    overlay: Overlay,
    frameIndex: number,
    frameStartsMs: number[],
    frames: GifFrame[]
  ): { visibleText: string; showCursor: boolean } {
    const effect = overlay.effects[0];
    if (effect?.type !== "typewriter") {
      return { visibleText: overlay.content, showCursor: false };
    }

    const graphemes = this.splitGraphemes(overlay.content);
    if (graphemes.length === 0) return { visibleText: "", showCursor: false };

    const startFrame = Math.max(0, Math.min(frames.length - 1, effect.startFrame));
    const endFrame = Math.max(startFrame, Math.min(frames.length - 1, effect.endFrame));

    if (frameIndex <= startFrame) return { visibleText: "", showCursor: true };
    if (frameIndex >= endFrame) return { visibleText: overlay.content, showCursor: false };

    const startMs = frameStartsMs[startFrame] ?? 0;
    const endMs = (frameStartsMs[endFrame] ?? startMs) + Math.max(10, frames[endFrame]?.delay ?? 100);
    const currentMs = frameStartsMs[frameIndex] ?? startMs;
    const durationMs = Math.max(1, endMs - startMs);
    const t = Math.max(0, Math.min(1, (currentMs - startMs) / durationMs));
    const visibleCount = Math.max(0, Math.min(graphemes.length, Math.floor(t * graphemes.length)));
    const visibleText = graphemes.slice(0, visibleCount).join("");

    const blinkWindowMs = 500;
    const blinkOn = Math.floor((currentMs - startMs) / blinkWindowMs) % 2 === 0;
    const showCursor = visibleCount < graphemes.length && blinkOn;

    return { visibleText, showCursor };
  }

  private remapEffectForTrim(effect: Effect, trimStart: number, trimmedLen: number): Effect {
    return {
      ...effect,
      startFrame: Math.max(0, Math.min(trimmedLen - 1, effect.startFrame - trimStart)),
      endFrame: Math.max(0, Math.min(trimmedLen - 1, effect.endFrame - trimStart)),
    };
  }

  private remapOverlayRangeForTrim(overlay: Overlay, trimStart: number, trimmedLen: number): Pick<Overlay, "inFrame" | "outFrame"> {
    if (!Number.isFinite(overlay.inFrame) && !Number.isFinite(overlay.outFrame)) {
      return { inFrame: overlay.inFrame, outFrame: overlay.outFrame };
    }
    const range = getOverlayFrameRange(overlay, trimmedLen + trimStart);
    const inFrame = Math.max(0, Math.min(trimmedLen - 1, range.inFrame - trimStart));
    const outFrame = Math.max(inFrame, Math.min(trimmedLen - 1, range.outFrame - trimStart));
    return { inFrame, outFrame };
  }

  async addTextOverlays(
    file: File,
    overlays: Overlay[],
    _frameCount: number,
    options?: TransformOptions
  ): Promise<ProcessingResult> {
    const signal = options?.signal;
    if (!this._ready || !this._gifuct) await this.initialize();
    if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
    this.reportProgress("Decoding", 5);
    const decoded = await this.decode(file, signal);
    let frames = decoded.frames;
    const metadata = decoded.metadata;
    if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
    const trimStart = options?.trimStart ?? 0;
    const trimEnd = options?.trimEnd ?? frames.length - 1;
    let overlaysToUse = overlays;
    if (trimStart > 0 || trimEnd < frames.length - 1) {
      const start = Math.max(0, trimStart);
      const end = Math.min(frames.length - 1, trimEnd);
      frames = frames.slice(start, end + 1);
      const trimmedLen = frames.length;
      overlaysToUse = overlays.map((o) => ({
        ...o,
        keyframes: o.keyframes.map((k) => ({
          ...k,
          frameIndex: Math.max(0, Math.min(trimmedLen - 1, k.frameIndex - start)),
        })),
        effects: o.effects.map((fx) => this.remapEffectForTrim(fx, start, trimmedLen)),
        ...this.remapOverlayRangeForTrim(o, start, trimmedLen),
      }));
    }
    const sourceW = options?.cropRect ? Math.max(1, Math.round(options.cropRect.width)) : metadata.width;
    const sourceH = options?.cropRect ? Math.max(1, Math.round(options.cropRect.height)) : metadata.height;
    const w = options?.width ?? sourceW;
    const h = options?.height ?? sourceH;
    const outW = w;
    const outH = h;

    if (typeof document === "undefined" || frames.length === 0) {
      return { blob: new Blob(), format: "gif", width: outW, height: outH, sizeBytes: 0 };
    }

    this.reportProgress("Decoded", 15);
    const canvas = document.createElement("canvas");
    canvas.width = metadata.width;
    canvas.height = metadata.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: new Blob(), format: "gif", width: outW, height: outH, sizeBytes: 0 };

    const temp = document.createElement("canvas");
    temp.width = metadata.width;
    temp.height = metadata.height;
    const tctx = temp.getContext("2d");
    if (!tctx) return { blob: new Blob(), format: "gif", width: outW, height: outH, sizeBytes: 0 };

    const total = frames.length;
    const frameStartsMs = this.getFrameStartTimes(frames);

    // Preload image overlay HTMLImageElement objects before the frame loop
    const imageElementCache = new Map<string, HTMLImageElement>();
    await Promise.all(
      overlaysToUse
        .filter((o) => o.type === "image" && o.imageDataUrl && o.visible !== false)
        .map(
          (o) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                imageElementCache.set(o.id, img);
                resolve();
              };
              img.onerror = () => resolve();
              img.src = o.imageDataUrl!;
            })
        )
    );

    const composited: GifFrame[] = frames.map((frame, i) => {
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      tctx.putImageData(frame.imageData, 0, 0);
      ctx.drawImage(temp, 0, 0);
      for (const overlay of overlaysToUse) {
        if (overlay.visible === false) continue;
        const range = getOverlayFrameRange(overlay, frames.length);
        if (i < range.inFrame || i > range.outFrame) continue;
        const { x, y, scale, rotation, opacity } = this.interpolateOverlay(overlay, i);
        const px = x * metadata.width;
        const py = y * metadata.height;

        if (overlay.type === "image") {
          const img = imageElementCache.get(overlay.id);
          if (!img) continue;
          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.translate(px, py);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.scale(scale, scale);
          ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
          ctx.restore();
          continue;
        }

        if (overlay.type !== "text" || !overlay.content.trim()) continue;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.font = `${overlay.fontStyle ?? "normal"} ${overlay.fontWeight ?? "normal"} ${overlay.fontSize}px ${overlay.fontFamily}`;
        ctx.fillStyle = overlay.color;
        const textAlign = overlay.textAlign ?? "center";
        ctx.textAlign = textAlign;
        ctx.textBaseline = "middle";
        ctx.translate(px, py);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale, scale);

        const { visibleText, showCursor } = this.getTypewriterState(overlay, i, frameStartsMs, frames);
        const textToDraw = visibleText;
        const fullWidth = ctx.measureText(overlay.content).width;
        const visibleWidth = ctx.measureText(textToDraw).width;
        const isTypewriter = overlay.effects[0]?.type === "typewriter";
        const leftEdge =
          textAlign === "left"
            ? 0
            : textAlign === "right"
              ? -fullWidth
              : -fullWidth / 2;
        const drawX = isTypewriter
          ? leftEdge
          : 0;
        if (isTypewriter) {
          ctx.textAlign = "left";
        }

        if ((overlay.strokeWidth ?? 0) > 0 && textToDraw.length > 0) {
          ctx.strokeStyle = overlay.strokeColor ?? "#000000";
          ctx.lineWidth = (overlay.strokeWidth ?? 0) * 2;
          ctx.lineJoin = "round";
          ctx.strokeText(textToDraw, drawX, 0);
        }
        if (textToDraw.length > 0) {
          ctx.fillText(textToDraw, drawX, 0);
        }

        if (showCursor && isTypewriter) {
          const cursorWidth = Math.max(2, overlay.fontSize * 0.08);
          const cursorHeight = overlay.fontSize;
          const cursorX = leftEdge + visibleWidth + 1;
          const cursorY = -cursorHeight / 2;
          ctx.fillRect(cursorX, cursorY, cursorWidth, cursorHeight);
        }
        ctx.restore();
      }
      if (total > 0) this.reportProgress("Compositing", 15 + Math.round(((i + 1) / total) * 45));
      const out = ctx.getImageData(0, 0, metadata.width, metadata.height);
      return { ...frame, imageData: new ImageData(new Uint8ClampedArray(out.data), out.width, out.height) };
    });

    this.reportProgress("Encoding", 65);
    const cropped = options?.cropRect
      ? await this.cropFramesToCanvas(composited, options.cropRect, signal)
      : composited;
    const resized = w !== cropped[0].imageData.width || h !== cropped[0].imageData.height
      ? await this.resizeFramesToCanvas(cropped, w, h, signal)
      : cropped;
    if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
    const blob = await this.encodeFramesToGif(
      resized,
      resized[0].imageData.width,
      resized[0].imageData.height,
      (p) => this.reportProgress("Encoding", 65 + Math.round(p * 35)),
      signal
    );
    this.reportProgress("Done", 100);
    return { blob, format: options?.format ?? "gif", width: outW, height: outH, sizeBytes: blob.size };
  }

  dispose(): void {
    this._progressCallback = null;
    this._ready = false;
    this._gifuct = null;
  }
}
