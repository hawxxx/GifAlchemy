import type { Overlay } from "@/core/domain/project";

export type TweenEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out";

export function applyEasing(t: number, easing: string): number {
  const c = Math.max(0, Math.min(1, t));
  if (easing === "ease-in") return c * c;
  if (easing === "ease-out") return c * (2 - c);
  if (easing === "ease-in-out") return c < 0.5 ? 2 * c * c : -1 + (4 - 2 * c) * c;
  return c;
}

/**
 * Generates intermediate (tweened) keyframes between each pair of anchor keyframes
 * in the overlay. Existing tweened keyframes are replaced; anchor keyframes are kept.
 */
export function generateTweenedKeyframes(
  overlay: Overlay,
  easing: TweenEasing
): Overlay["keyframes"] {
  const anchors = overlay.keyframes
    .filter((kf) => !kf.tweened)
    .sort((a, b) => a.frameIndex - b.frameIndex);

  if (anchors.length < 2) return overlay.keyframes;

  const tweened: Overlay["keyframes"] = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const from = anchors[i];
    const to = anchors[i + 1];
    for (let f = from.frameIndex + 1; f < to.frameIndex; f++) {
      const tRaw = (f - from.frameIndex) / (to.frameIndex - from.frameIndex);
      const t = applyEasing(tRaw, easing);
      tweened.push({
        frameIndex: f,
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        scale: from.scale + (to.scale - from.scale) * t,
        rotation: from.rotation + (to.rotation - from.rotation) * t,
        opacity: from.opacity + (to.opacity - from.opacity) * t,
        tweened: true,
      });
    }
  }

  return [...anchors, ...tweened].sort((a, b) => a.frameIndex - b.frameIndex);
}
