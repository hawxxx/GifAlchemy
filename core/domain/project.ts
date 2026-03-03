import type { OutputFormat } from "./gif-types";

export interface Project {
  id: string;
  name: string;
  sourceFile: { name: string; size: number; type: string };
  timeline: Timeline;
  outputSettings: OutputSettings;
  trimStart: number;
  trimEnd: number;
  /** Playback speed multiplier persisted with project (for example 0.5, 1, 1.5, 2). */
  playbackRate?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Timeline {
  duration: number;
  frameCount: number;
  overlays: Overlay[];
}

export interface Overlay {
  id: string;
  type: "text";
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  color: string;
  strokeWidth: number;
  strokeColor: string;
  keyframes: Keyframe[];
  effects: Effect[];
  /** When false, layer is hidden on canvas and in export. Default true. */
  visible?: boolean;
  /** When true, layer edits/movement/removal are blocked until unlocked. */
  locked?: boolean;
}

export interface Keyframe {
  frameIndex: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface Effect {
  type: AnimationPresetType;
  startFrame: number;
  endFrame: number;
  easing: "linear" | "ease-in" | "ease-out" | "ease-in-out";
}

export type AnimationPresetType =
  | "fade-in"
  | "fade-out"
  | "slide-up"
  | "slide-down"
  | "pop"
  | "scale-in"
  | "rotate-in"
  | "flicker"
  | "typewriter"
  | "bounce"
  | "shake"
  | "wiggle"
  | "pulse";

export interface OutputSettings {
  width: number;
  height: number;
  format: OutputFormat;
  quality: number;
}
