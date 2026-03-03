import type {
  Overlay,
  Keyframe,
  Effect,
  AnimationPresetType,
} from "@/core/domain/project";
const DEFAULT_KEYFRAME: Omit<Keyframe, "frameIndex"> = {
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
  opacity: 1,
};

function generateId(): string {
  return `ol_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createTextOverlay(
  frameCount: number,
  overrides?: Partial<
    Pick<
      Overlay,
      | "content"
      | "fontFamily"
      | "fontSize"
      | "color"
      | "textAlign"
      | "strokeWidth"
      | "strokeColor"
      | "fontWeight"
      | "fontStyle"
      | "visible"
      | "locked"
    >
  >
): Overlay {
  const first: Keyframe = { ...DEFAULT_KEYFRAME, frameIndex: 0 };
  const last: Keyframe = {
    ...DEFAULT_KEYFRAME,
    frameIndex: Math.max(0, frameCount - 1),
  };
  return {
    id: generateId(),
    type: "text",
    content: overrides?.content ?? "Text",
    fontFamily: overrides?.fontFamily ?? "system-ui",
    fontSize: overrides?.fontSize ?? 32,
    fontWeight: overrides?.fontWeight ?? "normal",
    fontStyle: overrides?.fontStyle ?? "normal",
    textAlign: overrides?.textAlign ?? "center",
    color: overrides?.color ?? "#ffffff",
    strokeWidth: overrides?.strokeWidth ?? 2,
    strokeColor: overrides?.strokeColor ?? "#000000",
    keyframes: [first, last],
    effects: [],
    visible: overrides?.visible ?? true,
    locked: overrides?.locked ?? false,
  };
}

export function updateOverlay(
  overlays: Overlay[],
  id: string,
  updates: Partial<
    Pick<
      Overlay,
      | "content"
      | "fontFamily"
      | "fontSize"
      | "fontWeight"
      | "fontStyle"
      | "textAlign"
      | "color"
      | "strokeWidth"
      | "strokeColor"
      | "keyframes"
      | "effects"
      | "visible"
      | "locked"
    >
  >
): Overlay[] {
  return overlays.map((o) =>
    o.id === id ? { ...o, ...updates } : o
  );
}

export function removeOverlay(overlays: Overlay[], id: string): Overlay[] {
  return overlays.filter((o) => o.id !== id);
}

export function addKeyframe(
  overlay: Overlay,
  frameIndex: number
): Overlay {
  const existing = overlay.keyframes.find((k) => k.frameIndex === frameIndex);
  if (existing) return overlay;
  const prev = [...overlay.keyframes].sort((a, b) => a.frameIndex - b.frameIndex).filter((k) => k.frameIndex < frameIndex).pop();
  const next = overlay.keyframes.find((k) => k.frameIndex > frameIndex);
  const prevKf = prev ?? overlay.keyframes[0];
  const nextKf = next ?? overlay.keyframes[overlay.keyframes.length - 1];
  const t = nextKf && prevKf
    ? (frameIndex - prevKf.frameIndex) / (nextKf.frameIndex - prevKf.frameIndex)
    : 0;
  const interpolated: Keyframe = {
    frameIndex,
    x: prevKf.x + (nextKf ? (nextKf.x - prevKf.x) * t : 0),
    y: prevKf.y + (nextKf ? (nextKf.y - prevKf.y) * t : 0),
    scale: prevKf.scale + (nextKf ? (nextKf.scale - prevKf.scale) * t : 0),
    rotation: prevKf.rotation + (nextKf ? (nextKf.rotation - prevKf.rotation) * t : 0),
    opacity: prevKf.opacity + (nextKf ? (nextKf.opacity - prevKf.opacity) * t : 0),
  };
  const keyframes = [...overlay.keyframes, interpolated].sort(
    (a, b) => a.frameIndex - b.frameIndex
  );
  return { ...overlay, keyframes };
}

export function bakeEffectToKeyframes(
  overlay: Overlay,
  effectType: AnimationPresetType,
  startFrame: number,
  endFrame: number,
  easing: Effect["easing"] = "ease-out"
): Overlay {
  const keyframes = [...overlay.keyframes];
  const duration = endFrame - startFrame;
  if (duration <= 0) return overlay;

  const ease = (t: number): number => {
    if (easing === "linear") return t;
    if (easing === "ease-in") return t * t;
    if (easing === "ease-out") return 1 - (1 - t) * (1 - t);
    if (easing === "ease-in-out") return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return t;
  };

  const bounceScale = (t: number): number => {
    if (t <= 0.65) return 0.25 + (1.18 - 0.25) * ease(t / 0.65);
    return 1.18 + (1 - 1.18) * ease((t - 0.65) / 0.35);
  };
  const shakeX = (t: number): number => 0.03 * Math.sin(t * 4 * Math.PI);
  const wiggleRot = (t: number): number => 12 * Math.sin(t * 2 * Math.PI);
  const pulseScale = (t: number): number => 1 + 0.22 * Math.sin(t * Math.PI);

  for (let f = startFrame; f <= endFrame; f++) {
    const t = (f - startFrame) / duration;
    const e = ease(t);
    let opacity = 1;
    let y = 0;
    let scale = 1;
    let x = 0;
    let rotation = 0;
    if (effectType === "fade-in") {
      opacity = e;
    } else if (effectType === "fade-out") {
      opacity = 1 - e;
    } else if (effectType === "slide-up") {
      y = (1 - e) * 0.15;
    } else if (effectType === "slide-down") {
      y = e * 0.15;
    } else if (effectType === "pop") {
      scale = 0.3 + 0.7 * e;
    } else if (effectType === "scale-in") {
      scale = 0.6 + 0.4 * e;
    } else if (effectType === "rotate-in") {
      rotation = -24 * (1 - e);
    } else if (effectType === "flicker") {
      opacity = Math.max(0.2, 0.55 + 0.45 * Math.sin(t * Math.PI * 12));
    } else if (effectType === "bounce") {
      scale = bounceScale(t);
    } else if (effectType === "shake") {
      x = shakeX(t);
    } else if (effectType === "wiggle") {
      rotation = wiggleRot(t);
    } else if (effectType === "pulse") {
      scale = pulseScale(t);
    }
    const existingIdx = keyframes.findIndex((k) => k.frameIndex === f);
    const base = keyframes.find((k) => k.frameIndex <= f);
    const baseKf = base ?? keyframes[0];
    const applyOpacity = ["fade-in", "fade-out", "flicker"].includes(effectType);
    const applyY = ["slide-up", "slide-down"].includes(effectType);
    const applyScale = ["pop", "scale-in", "bounce", "pulse"].includes(effectType);
    const applyX = effectType === "shake";
    const applyRotation = ["wiggle", "rotate-in"].includes(effectType);
    if (existingIdx >= 0) {
      keyframes[existingIdx] = {
        ...keyframes[existingIdx],
        opacity: applyOpacity ? opacity : keyframes[existingIdx].opacity,
        y: applyY ? baseKf.y + y : keyframes[existingIdx].y,
        scale: applyScale ? scale : keyframes[existingIdx].scale,
        x: applyX ? baseKf.x + x : keyframes[existingIdx].x,
        rotation: applyRotation ? baseKf.rotation + rotation : keyframes[existingIdx].rotation,
      };
    } else {
      keyframes.push({
        frameIndex: f,
        x: baseKf.x + (applyX ? x : 0),
        y: baseKf.y + (applyY ? y : 0),
        scale: applyScale ? scale : baseKf.scale,
        rotation: baseKf.rotation + (applyRotation ? rotation : 0),
        opacity: applyOpacity ? opacity : baseKf.opacity,
      });
      keyframes.sort((a, b) => a.frameIndex - b.frameIndex);
    }
  }
  const effect: Effect = {
    type: effectType,
    startFrame,
    endFrame,
    easing,
  };
  return { ...overlay, keyframes, effects: [effect] };
}

export function clearEffect(overlay: Overlay, frameCount: number): Overlay {
  const kfs = [...overlay.keyframes].sort((a, b) => a.frameIndex - b.frameIndex);
  const first = kfs[0];
  const last = kfs[kfs.length - 1];
  if (!first || !last) return { ...overlay, effects: [] };
  const newFirst: Keyframe = { ...DEFAULT_KEYFRAME, frameIndex: 0, x: first.x, y: first.y };
  const newLast: Keyframe = {
    ...DEFAULT_KEYFRAME,
    frameIndex: Math.max(0, frameCount - 1),
    x: last.x,
    y: last.y,
  };
  return { ...overlay, keyframes: [newFirst, newLast], effects: [] };
}
