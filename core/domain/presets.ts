import type { AnimationPresetType } from "./project";

export interface ResizePreset {
  id: string;
  label: string;
  width: number | null;
  height: number | null;
  description?: string;
}

export const RESIZE_PRESETS: ResizePreset[] = [
  { id: "original", label: "Original", width: null, height: null },
  { id: "sticker", label: "Sticker (128px)", width: 128, height: 128, description: "128 × 128" },
  { id: "social", label: "Social (480px)", width: 480, height: null, description: "480px width" },
  { id: "hd", label: "HD (720px)", width: 720, height: null, description: "720px width" },
];

export interface AnimationPresetOption {
  id: AnimationPresetType | "none";
  label: string;
  description?: string;
}

export const ANIMATION_PRESETS: AnimationPresetOption[] = [
  { id: "none", label: "None", description: "No animation" },
  { id: "fade-in", label: "Fade In", description: "Fade in from transparent" },
  { id: "fade-out", label: "Fade Out", description: "Fade out to transparent" },
  { id: "slide-up", label: "Slide Up", description: "Move up into view" },
  { id: "slide-down", label: "Slide Down", description: "Move down into view" },
  { id: "pop", label: "Pop", description: "Scale up from small" },
  { id: "bounce", label: "Bounce", description: "Bounce in with overshoot" },
  { id: "shake", label: "Shake", description: "Horizontal shake" },
  { id: "wiggle", label: "Wiggle", description: "Rotation wiggle" },
  { id: "pulse", label: "Pulse", description: "Scale pulse in and out" },
  { id: "typewriter", label: "Typewriter", description: "Reveal character by character" },
];
