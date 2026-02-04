export interface WordBox {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  confidence: number;
}

export interface HighlightColor {
  name: string;
  value: string;
}

// Light mode colors (low opacity for light backgrounds)
export const HIGHLIGHT_COLORS_LIGHT: HighlightColor[] = [
  { name: "Yellow", value: "rgba(255, 230, 0, 0.3)" },
  { name: "Green", value: "rgba(0, 255, 127, 0.3)" },
  { name: "Pink", value: "rgba(255, 105, 180, 0.3)" },
  { name: "Blue", value: "rgba(0, 191, 255, 0.3)" },
  { name: "Orange", value: "rgba(255, 165, 0, 0.3)" },
  { name: "Purple", value: "rgba(186, 85, 211, 0.3)" },
];

// Dark mode colors (higher opacity, slightly muted for dark backgrounds)
// These colors are designed to be visible on dark backgrounds while keeping text legible
export const HIGHLIGHT_COLORS_DARK: HighlightColor[] = [
  { name: "Yellow", value: "rgba(255, 230, 0, 0.3)" },
  { name: "Green", value: "rgba(0, 255, 127, 0.3)" },
  { name: "Pink", value: "rgba(255, 105, 180, 0.3)" },
  { name: "Blue", value: "rgba(0, 191, 255, 0.3)" },
  { name: "Orange", value: "rgba(255, 165, 0, 0.3)" },
  { name: "Purple", value: "rgba(186, 85, 211, 0.3)" },
];

// Legacy export for backwards compatibility
export const HIGHLIGHT_COLORS = HIGHLIGHT_COLORS_LIGHT;

// Determine if a background color is "dark" based on relative luminance
// Uses the standard formula for perceived brightness
export function isDarkBackground(rgb: [number, number, number]): boolean {
  const [r, g, b] = rgb;
  // Calculate relative luminance using the formula for perceived brightness
  // Human eyes are more sensitive to green, less to blue
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Threshold at 0.5 (middle of the spectrum)
  return luminance < 0.5;
}

// Get the appropriate highlight colors based on background brightness
export function getHighlightColors(
  backgroundColor: [number, number, number]
): HighlightColor[] {
  return isDarkBackground(backgroundColor)
    ? HIGHLIGHT_COLORS_DARK
    : HIGHLIGHT_COLORS_LIGHT;
}

export interface OCRResult {
  words: WordBox[];
  backgroundColor: [number, number, number];
  imageWidth: number;
  imageHeight: number;
}

export type MarkingMode = "highlight" | "circle" | "underline" | "unblur";

// Camera movement direction options
export type CameraMovement =
  | "left-right"
  | "right-left"
  | "up-down"
  | "down-up"
  | "zoom-in"
  | "zoom-out"
  | "none";

// Blur effect options
export type BlurMode = "blur-in" | "blur-out" | "blur-in-out" | "none";

export interface HighlightProps {
  imageSrc: string;
  selectedWords: WordBox[];
  backgroundColor: [number, number, number];
  imageWidth: number;
  imageHeight: number;
  highlightColor: string;
  markingMode: MarkingMode;
  leadInSeconds: number;
  leadOutSeconds: number;
  charsPerSecond: number;
  previewSeconds?: number;
  unblurSeconds: number;
  blurredBackground: boolean;
  cameraMovement: CameraMovement;
  blurMode: BlurMode;
  vcrEffect: boolean;
  attributionText: string;
}

// Circle/pen stroke colors for light backgrounds (darker colors with multiply blend)
export const CIRCLE_COLORS_LIGHT: HighlightColor[] = [
  { name: "Red", value: "rgba(220, 38, 38, 0.85)" },
  { name: "Blue", value: "rgba(37, 99, 235, 0.85)" },
  { name: "Black", value: "rgba(0, 0, 0, 0.85)" },
  { name: "Green", value: "rgba(22, 163, 74, 0.85)" },
  { name: "Purple", value: "rgba(147, 51, 234, 0.85)" },
  { name: "Orange", value: "rgba(234, 88, 12, 0.85)" },
];

// Circle/pen stroke colors for dark backgrounds (lighter colors with screen blend)
export const CIRCLE_COLORS_DARK: HighlightColor[] = [
  { name: "Red", value: "rgba(255, 100, 100, 0.9)" },
  { name: "Blue", value: "rgba(100, 150, 255, 0.9)" },
  { name: "White", value: "rgba(255, 255, 255, 0.9)" },
  { name: "Green", value: "rgba(100, 255, 150, 0.9)" },
  { name: "Purple", value: "rgba(200, 150, 255, 0.9)" },
  { name: "Orange", value: "rgba(255, 180, 100, 0.9)" },
];

// Legacy export for backwards compatibility
export const CIRCLE_COLORS = CIRCLE_COLORS_LIGHT;

// Get circle colors based on background brightness
export function getCircleColors(
  backgroundColor: [number, number, number]
): HighlightColor[] {
  return isDarkBackground(backgroundColor)
    ? CIRCLE_COLORS_DARK
    : CIRCLE_COLORS_LIGHT;
}

export interface UploadResponse {
  filename: string;
  path: string;
}

export interface RenderResponse {
  videoPath: string;
}

// Default timing values
export const DEFAULT_LEAD_IN_SECONDS = 1;
export const DEFAULT_LEAD_OUT_SECONDS = 2;
export const MIN_LEAD_SECONDS = 0;
export const MAX_LEAD_SECONDS = 8;
export const FPS = 30;

// Unblur animation duration (seconds)
export const DEFAULT_UNBLUR_SECONDS = 0.6;
export const MIN_UNBLUR_SECONDS = 0.1;
export const MAX_UNBLUR_SECONDS = 3;

// Highlight animation speed (characters per second)
export const DEFAULT_CHARS_PER_SECOND = 15;
export const MIN_CHARS_PER_SECOND = 5;
export const MAX_CHARS_PER_SECOND = 30;

// Legacy export for backwards compatibility
export const CHARS_PER_SECOND = DEFAULT_CHARS_PER_SECOND;
