import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  staticFile,
} from "remotion";
import type { HighlightProps, MarkingMode } from "../src/types";
import {
  DEFAULT_LEAD_IN_SECONDS,
  DEFAULT_LEAD_OUT_SECONDS,
  DEFAULT_CHARS_PER_SECOND,
  FPS,
  isDarkBackground,
} from "../src/types";
import { RoughHighlighter } from "./components/RoughHighlighter";
import { SvgCircler } from "./components/SvgCircler";

export const HighlightComposition: React.FC<Record<string, unknown>> = (
  props
) => {
  const typedProps = props as unknown as HighlightProps;
  const {
    imageSrc = "",
    selectedWords = [],
    backgroundColor = [255, 255, 255],
    imageWidth = 1920,
    imageHeight = 1080,
    highlightColor = "rgba(255, 230, 0, 0.5)",
    markingMode = "highlight" as MarkingMode,
    leadInSeconds = DEFAULT_LEAD_IN_SECONDS,
    charsPerSecond = DEFAULT_CHARS_PER_SECOND,
    leadOutSeconds: _leadOutSeconds = DEFAULT_LEAD_OUT_SECONDS,
  } = typedProps;
  void _leadOutSeconds; // Used in duration calculation in Root.tsx
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Calculate timing based on lead-in/lead-out
  const leadInFrames = Math.round(leadInSeconds * FPS);

  // Animation values - animate over the entire video duration
  const blur = interpolate(frame, [0, 30], [20, 0], {
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.05], {
    extrapolateRight: "clamp",
  });

  const rotateX = interpolate(frame, [0, durationInFrames], [7.5, -7.5], {
    extrapolateRight: "clamp",
  });

  const rotateY = interpolate(frame, [0, durationInFrames], [-7.5, 7.5], {
    extrapolateRight: "clamp",
  });

  // Calculate total highlight duration based on character count
  const totalCharacters = selectedWords.reduce(
    (sum, word) => sum + word.text.length,
    0
  );
  const totalHighlightFrames = Math.max(
    30,
    Math.ceil((totalCharacters / charsPerSecond) * FPS)
  );

  // Frames elapsed since highlight animation started
  // Highlight starts after lead-in period (minimum 30 frames for blur to clear)
  const highlightStartFrame = Math.max(30, leadInFrames);
  const highlightFrame = Math.max(0, frame - highlightStartFrame);

  const bgColor = `rgb(${backgroundColor[0]}, ${backgroundColor[1]}, ${backgroundColor[2]})`;

  // Use different blend modes for light vs dark backgrounds
  // multiply: white becomes transparent (good for light backgrounds)
  // screen: black becomes transparent (good for dark backgrounds)
  const blendMode = isDarkBackground(backgroundColor) ? "screen" : "multiply";

  // Calculate image dimensions to fit within composition while maintaining aspect ratio
  const compositionWidth = 1920;
  const compositionHeight = 1080;
  const padding = 100;

  const availableWidth = compositionWidth - padding * 2;
  const availableHeight = compositionHeight - padding * 2;

  const imageAspect = imageWidth / imageHeight;
  const containerAspect = availableWidth / availableHeight;

  let displayWidth: number;
  let displayHeight: number;

  if (imageAspect > containerAspect) {
    displayWidth = availableWidth;
    displayHeight = availableWidth / imageAspect;
  } else {
    displayHeight = availableHeight;
    displayWidth = availableHeight * imageAspect;
  }

  const scaleFactor = displayWidth / imageWidth;

  // Resolve the image source
  const resolvedImageSrc =
    imageSrc.startsWith("http") || imageSrc.startsWith("/")
      ? imageSrc
      : staticFile(imageSrc);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        perspective: "1200px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
          filter: `blur(${blur}px)`,
          position: "relative",
          width: displayWidth,
          height: displayHeight,
        }}
      >
        {/* Highlighter layer - behind the image text (only for highlight mode) */}
        {markingMode === "highlight" && (
          <RoughHighlighter
            words={selectedWords}
            animationFrame={highlightFrame}
            totalHighlightFrames={totalHighlightFrames}
            scaleFactor={scaleFactor}
            width={displayWidth}
            height={displayHeight}
            highlightColor={highlightColor}
          />
        )}

        {/* Image layer */}
        {imageSrc && (
          <Img
            src={resolvedImageSrc}
            style={{
              width: displayWidth,
              height: displayHeight,
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 2,
              mixBlendMode: markingMode === "highlight" ? blendMode : "normal",
            }}
          />
        )}

        {/* Circle layer - on top of the image (only for circle mode) */}
        {markingMode === "circle" && (
          <SvgCircler
            words={selectedWords}
            animationFrame={highlightFrame}
            totalHighlightFrames={totalHighlightFrames}
            scaleFactor={scaleFactor}
            width={displayWidth}
            height={displayHeight}
            circleColor={highlightColor}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};
