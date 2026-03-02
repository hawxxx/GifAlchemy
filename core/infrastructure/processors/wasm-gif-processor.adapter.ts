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
import type { Overlay } from "@/core/domain/project";

type GifuctPatch = typeof import("gifuct-js");

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
    if (!this._ready || !this._gifuct) await this.initialize();
    if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
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
        patchCtx.putImageData(new ImageData(raw.patch, pw, ph), 0, 0);
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
    const { frames, metadata } = await this.decode(file, signal);
    if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
    this.reportProgress("Decoded", 25);
    const w = options.width ?? metadata.width;
    const h = options.height ?? metadata.height;
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
    const { frames, metadata } = await this.decode(file, signal);
    if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
    const w = options?.width ?? metadata.width;
    const h = options?.height ?? metadata.height;
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
    const composited: GifFrame[] = frames.map((frame, i) => {
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      tctx.putImageData(frame.imageData, 0, 0);
      ctx.drawImage(temp, 0, 0);
      for (const overlay of overlays) {
        if (overlay.type !== "text" || !overlay.content.trim()) continue;
        const { x, y, scale, rotation, opacity } = this.interpolateOverlay(overlay, i);
        const px = x * metadata.width;
        const py = y * metadata.height;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.font = `${overlay.fontStyle ?? "normal"} ${overlay.fontWeight ?? "normal"} ${overlay.fontSize}px ${overlay.fontFamily}`;
        ctx.fillStyle = overlay.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.translate(px, py);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale, scale);
        if ((overlay.strokeWidth ?? 0) > 0) {
          ctx.strokeStyle = overlay.strokeColor ?? "#000000";
          ctx.lineWidth = (overlay.strokeWidth ?? 0) * 2;
          ctx.lineJoin = "round";
          ctx.strokeText(overlay.content, 0, 0);
        }
        ctx.fillText(overlay.content, 0, 0);
        ctx.restore();
      }
      if (total > 0) this.reportProgress("Compositing", 15 + Math.round(((i + 1) / total) * 45));
      const out = ctx.getImageData(0, 0, metadata.width, metadata.height);
      return { ...frame, imageData: new ImageData(new Uint8ClampedArray(out.data), out.width, out.height) };
    });

    this.reportProgress("Encoding", 65);
    const resized = w !== metadata.width || h !== metadata.height
      ? await this.resizeFramesToCanvas(composited, w, h, signal)
      : composited;
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
