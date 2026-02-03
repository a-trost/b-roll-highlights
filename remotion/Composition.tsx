import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  staticFile,
} from "remotion";
import type { HighlightProps, MarkingMode, CameraMovement, BlurMode } from "../src/types";
import {
  DEFAULT_LEAD_IN_SECONDS,
  DEFAULT_LEAD_OUT_SECONDS,
  DEFAULT_CHARS_PER_SECOND,
  FPS,
  isDarkBackground,
} from "../src/types";
import { RoughHighlighter } from "./components/RoughHighlighter";
import { SvgCircler } from "./components/SvgCircler";
import { SvgUnderliner } from "./components/SvgUnderliner";
import { VCREffect } from "./components/VCREffect";

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
    blurredBackground = false,
    cameraMovement = "left-right" as CameraMovement,
    blurMode = "blur-in" as BlurMode,
    vcrEffect = false,
  } = typedProps;
  void _leadOutSeconds; // Used in duration calculation in Root.tsx
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Calculate timing based on lead-in/lead-out
  const leadInFrames = Math.round(leadInSeconds * FPS);

  // Calculate blur based on blur mode
  const calculateBlur = (): number => {
    const maxBlur = 20;
    const blurDuration = 30; // frames for blur transition

    switch (blurMode) {
      case "blur-in":
        return interpolate(frame, [0, blurDuration], [maxBlur, 0], {
          extrapolateRight: "clamp",
        });
      case "blur-out":
        return interpolate(
          frame,
          [durationInFrames - blurDuration, durationInFrames],
          [0, maxBlur],
          { extrapolateLeft: "clamp" }
        );
      case "blur-in-out":
        if (frame < blurDuration) {
          return interpolate(frame, [0, blurDuration], [maxBlur, 0], {
            extrapolateRight: "clamp",
          });
        } else if (frame > durationInFrames - blurDuration) {
          return interpolate(
            frame,
            [durationInFrames - blurDuration, durationInFrames],
            [0, maxBlur],
            { extrapolateLeft: "clamp" }
          );
        }
        return 0;
      case "none":
      default:
        return 0;
    }
  };

  const blur = calculateBlur();

  // Calculate camera movement based on setting
  const calculateCameraTransform = (): {
    rotateX: number;
    rotateY: number;
    scale: number;
  } => {
    const rotationAmount = 7.5;
    const scaleStart = 1.0;
    const scaleEnd = 1.05;

    switch (cameraMovement) {
      case "left-right":
        return {
          rotateX: 0,
          rotateY: interpolate(
            frame,
            [0, durationInFrames],
            [-rotationAmount, rotationAmount],
            { extrapolateRight: "clamp" }
          ),
          scale: interpolate(frame, [0, durationInFrames], [scaleStart, scaleEnd], {
            extrapolateRight: "clamp",
          }),
        };
      case "right-left":
        return {
          rotateX: 0,
          rotateY: interpolate(
            frame,
            [0, durationInFrames],
            [rotationAmount, -rotationAmount],
            { extrapolateRight: "clamp" }
          ),
          scale: interpolate(frame, [0, durationInFrames], [scaleStart, scaleEnd], {
            extrapolateRight: "clamp",
          }),
        };
      case "up-down":
        return {
          rotateX: interpolate(
            frame,
            [0, durationInFrames],
            [rotationAmount, -rotationAmount],
            { extrapolateRight: "clamp" }
          ),
          rotateY: 0,
          scale: interpolate(frame, [0, durationInFrames], [scaleStart, scaleEnd], {
            extrapolateRight: "clamp",
          }),
        };
      case "down-up":
        return {
          rotateX: interpolate(
            frame,
            [0, durationInFrames],
            [-rotationAmount, rotationAmount],
            { extrapolateRight: "clamp" }
          ),
          rotateY: 0,
          scale: interpolate(frame, [0, durationInFrames], [scaleStart, scaleEnd], {
            extrapolateRight: "clamp",
          }),
        };
      case "zoom-in":
        return {
          rotateX: 0,
          rotateY: 0,
          scale: interpolate(frame, [0, durationInFrames], [scaleStart, scaleEnd + 0.1], {
            extrapolateRight: "clamp",
          }),
        };
      case "zoom-out":
        return {
          rotateX: 0,
          rotateY: 0,
          scale: interpolate(frame, [0, durationInFrames], [scaleEnd + 0.1, scaleStart], {
            extrapolateRight: "clamp",
          }),
        };
      case "none":
      default:
        return {
          rotateX: 0,
          rotateY: 0,
          scale: 1.0,
        };
    }
  };

  const { rotateX, rotateY, scale } = calculateCameraTransform();

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
        overflow: "hidden",
      }}
    >
      {/* Blurred background image layer */}
      {blurredBackground && imageSrc && (
        <Img
          src={resolvedImageSrc}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${scale * 1.2})`,
            filter: "blur(40px)",
            width: "auto",
            height: "auto",
            minWidth: "120%",
            minHeight: "120%",
            objectFit: "cover",
            zIndex: 0,
            opacity: 0.7,
          }}
        />
      )}

      <div
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
          filter: `blur(${blur}px)`,
          position: "relative",
          width: displayWidth,
          height: displayHeight,
          zIndex: 1,
          overflow: "hidden",
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
            isDarkMode={isDarkBackground(backgroundColor)}
          />
        )}

        {/* Underline layer - on top of the image (only for underline mode) */}
        {markingMode === "underline" && (
          <SvgUnderliner
            words={selectedWords}
            animationFrame={highlightFrame}
            totalHighlightFrames={totalHighlightFrames}
            scaleFactor={scaleFactor}
            width={displayWidth}
            height={displayHeight}
            underlineColor={highlightColor}
            isDarkMode={isDarkBackground(backgroundColor)}
          />
        )}
      </div>

      {/* VCR Effect overlay - covers entire viewport */}
      {vcrEffect && <VCREffect intensity={0.7} />}
    </AbsoluteFill>
  );
};
