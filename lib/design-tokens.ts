export const colors = {
  background0: "#0D1014",
  background1: "#12171D",
  background2: "#171D25",
  panel: "#1B222C",
  borderSubtle: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.16)",
  accentPrimary: "#7098EF",
  accentSecondary: "#87A7F4",
  foreground: "#E8EDF5",
  mutedForeground: "#95A2B3",
  destructive: "#D86868",
} as const;

export const radius = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.625rem",
  xl: "0.875rem",
  xxl: "1.25rem",
  full: "9999px",
} as const;

export const spacing = {
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
} as const;

export const motion = {
  durationFast: "130ms",
  durationNormal: "170ms",
  durationUI: "200ms",
  durationSlow: "260ms",
  durationEmphasis: "320ms",
  durationAmbient: "640ms",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeInOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  easeStandard: "cubic-bezier(0.2, 0.75, 0.2, 1)",
  easeEmphasis: "cubic-bezier(0.22, 1, 0.36, 1)",
  easeSnappy: "cubic-bezier(0.34, 1.4, 0.64, 1)",
} as const;

export const designTokens = {
  colors,
  radius,
  spacing,
  motion,
} as const;

export type DesignTokens = typeof designTokens;
export type ColorTokenName = keyof typeof colors;
export type RadiusTokenName = keyof typeof radius;
export type SpacingTokenName = keyof typeof spacing;
export type MotionTokenName = keyof typeof motion;
