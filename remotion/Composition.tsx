import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  staticFile,
} from "remotion";
import type { HighlightProps, MarkingMode, CameraMovement, EnterAnimation, ExitAnimation } from "../src/types";
import { Easing } from "remotion";
import {
  DEFAULT_LEAD_IN_SECONDS,
  DEFAULT_LEAD_OUT_SECONDS,
  DEFAULT_CHARS_PER_SECOND,
  DEFAULT_UNBLUR_SECONDS,
  DEFAULT_ZOOM_DURATION_SECONDS,
  FPS,
  isDarkBackground,
} from "../src/types";
import { RoughHighlighter } from "./components/RoughHighlighter";
import { SvgCircler } from "./components/SvgCircler";
import { SvgUnderliner } from "./components/SvgUnderliner";
import { VCREffect } from "./components/VCREffect";
import { LowerThird } from "./components/LowerThird";
import { UnblurReveal } from "./components/UnblurReveal";

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
    unblurSeconds = DEFAULT_UNBLUR_SECONDS,
    zoomBox,
    zoomDurationSeconds = DEFAULT_ZOOM_DURATION_SECONDS,
    blurredBackground = false,
    cameraMovement = "left-right" as CameraMovement,
    enterAnimation = "blur" as EnterAnimation,
    exitAnimation = "none" as ExitAnimation,
    vcrEffect = false,
    attributionText = "",
  } = typedProps;
  void _leadOutSeconds; // Used in duration calculation in Root.tsx
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Calculate timing based on lead-in/lead-out
  const leadInFrames = Math.round(leadInSeconds * FPS);

  // Animation duration in frames
  const animationDuration = 30;
  const slideDistance = 150; // pixels to slide

  // Calculate enter animation values
  const calculateEnterAnimation = (): { blur: number; translateX: number; translateY: number; opacity: number } => {
    const maxBlur = 20;

    switch (enterAnimation) {
      case "blur":
        return {
          blur: interpolate(frame, [0, animationDuration], [maxBlur, 0], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          }),
          translateX: 0,
          translateY: 0,
          opacity: 1,
        };
      case "from-bottom":
        return {
          blur: 0,
          translateX: 0,
          translateY: interpolate(frame, [0, animationDuration], [slideDistance, 0], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          }),
          opacity: interpolate(frame, [0, animationDuration], [0, 1], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          }),
        };
      case "from-top":
        return {
          blur: 0,
          translateX: 0,
          translateY: interpolate(frame, [0, animationDuration], [-slideDistance, 0], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          }),
          opacity: interpolate(frame, [0, animationDuration], [0, 1], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          }),
        };
      case "from-left":
        return {
          blur: 0,
          translateX: interpolate(frame, [0, animationDuration], [-slideDistance, 0], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          }),
          translateY: 0,
          opacity: interpolate(frame, [0, animationDuration], [0, 1], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          }),
        };
      case "from-right":
        return {
          blur: 0,
          translateX: interpolate(frame, [0, animationDuration], [slideDistance, 0], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          }),
          translateY: 0,
          opacity: interpolate(frame, [0, animationDuration], [0, 1], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          }),
        };
      case "none":
      default:
        return { blur: 0, translateX: 0, translateY: 0, opacity: 1 };
    }
  };

  // Calculate exit animation values
  const calculateExitAnimation = (): { blur: number; translateX: number; translateY: number; opacity: number } => {
    const maxBlur = 20;
    // For slide animations, we have a 15 frame buffer at the end, so animation should end 15 frames early
    const isSlideExit = exitAnimation !== "blur" && exitAnimation !== "none";
    const exitBuffer = isSlideExit ? 15 : 0;
    const exitEnd = durationInFrames - exitBuffer;
    const exitStart = exitEnd - animationDuration;

    switch (exitAnimation) {
      case "blur":
        return {
          blur: interpolate(frame, [exitStart, exitEnd], [0, maxBlur], {
            extrapolateLeft: "clamp",
            easing: Easing.in(Easing.cubic),
          }),
          translateX: 0,
          translateY: 0,
          opacity: 1,
        };
      case "to-bottom":
        return {
          blur: 0,
          translateX: 0,
          translateY: interpolate(frame, [exitStart, exitEnd], [0, slideDistance], {
            extrapolateLeft: "clamp",
            easing: Easing.in(Easing.cubic),
          }),
          opacity: interpolate(frame, [exitStart, exitEnd], [1, 0], {
            extrapolateLeft: "clamp",
            easing: Easing.in(Easing.cubic),
          }),
        };
      case "to-top":
        return {
          blur: 0,
          translateX: 0,
          translateY: interpolate(frame, [exitStart, exitEnd], [0, -slideDistance], {
            extrapolateLeft: "clamp",
            easing: Easing.in(Easing.cubic),
          }),
          opacity: interpolate(frame, [exitStart, exitEnd], [1, 0], {
            extrapolateLeft: "clamp",
            easing: Easing.in(Easing.cubic),
          }),
        };
      case "to-left":
        return {
          blur: 0,
          translateX: interpolate(frame, [exitStart, exitEnd], [0, -slideDistance], {
            extrapolateLeft: "clamp",
            easing: Easing.in(Easing.cubic),
          }),
          translateY: 0,
          opacity: interpolate(frame, [exitStart, exitEnd], [1, 0], {
            extrapolateLeft: "clamp",
            easing: Easing.in(Easing.cubic),
          }),
        };
      case "to-right":
        return {
          blur: 0,
          translateX: interpolate(frame, [exitStart, exitEnd], [0, slideDistance], {
            extrapolateLeft: "clamp",
            easing: Easing.in(Easing.cubic),
          }),
          translateY: 0,
          opacity: interpolate(frame, [exitStart, exitEnd], [1, 0], {
            extrapolateLeft: "clamp",
            easing: Easing.in(Easing.cubic),
          }),
        };
      case "none":
      default:
        return { blur: 0, translateX: 0, translateY: 0, opacity: 1 };
    }
  };

  const enterAnim = calculateEnterAnimation();
  const exitAnim = calculateExitAnimation();

  // Combine enter and exit animations
  const blur = enterAnim.blur + exitAnim.blur;
  const translateX = enterAnim.translateX + exitAnim.translateX;
  const translateY = enterAnim.translateY + exitAnim.translateY;
  const opacity = Math.min(enterAnim.opacity, exitAnim.opacity);

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

  // Calculate zoom animation (for zoom mode)
  const calculateZoomTransform = (): { zoomScale: number; zoomTranslateX: number; zoomTranslateY: number } => {
    if (markingMode !== "zoom" || !zoomBox) {
      return { zoomScale: 1, zoomTranslateX: 0, zoomTranslateY: 0 };
    }

    const zoomDurationFrames = Math.round(zoomDurationSeconds * FPS);
    const zoomStartFrame = leadInFrames;
    const zoomEndFrame = zoomStartFrame + zoomDurationFrames;

    // Calculate zoom progress with ease-in-out
    const zoomProgress = interpolate(
      frame,
      [zoomStartFrame, zoomEndFrame],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.cubic),
      }
    );

    // Calculate target scale (1 / zoomBox.width gives us how much to zoom)
    const targetScale = 1 / zoomBox.width;
    const currentScale = interpolate(zoomProgress, [0, 1], [1, targetScale]);

    // Calculate translation to center the zoom box
    // The center of the zoomBox in normalized coordinates (0-1)
    const boxCenterX = zoomBox.x + zoomBox.width / 2;
    const boxCenterY = zoomBox.y + zoomBox.height / 2;

    // We need to translate so the box center becomes the viewport center
    // Translation is relative to the scaled image size
    const targetTranslateX = (0.5 - boxCenterX) * 100; // percentage
    const targetTranslateY = (0.5 - boxCenterY) * 100; // percentage

    const currentTranslateX = interpolate(zoomProgress, [0, 1], [0, targetTranslateX]);
    const currentTranslateY = interpolate(zoomProgress, [0, 1], [0, targetTranslateY]);

    return {
      zoomScale: currentScale,
      zoomTranslateX: currentTranslateX,
      zoomTranslateY: currentTranslateY,
    };
  };

  const { zoomScale, zoomTranslateX, zoomTranslateY } = calculateZoomTransform();

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
  const unblurDurationFrames = Math.max(1, Math.round(unblurSeconds * FPS));
  const unblurEndFrame = highlightStartFrame + unblurDurationFrames;
  const unblurProgress = interpolate(
    frame,
    [highlightStartFrame, unblurEndFrame],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const bgColor = `rgb(${backgroundColor[0]}, ${backgroundColor[1]}, ${backgroundColor[2]})`;

  // Use different blend modes for light vs dark backgrounds
  // multiply: white becomes transparent (good for light backgrounds)
  // screen: black becomes transparent (good for dark backgrounds)
  const blendMode = isDarkBackground(backgroundColor) ? "screen" : "multiply";
  const unblurBlurAmount = 6;
  const unblurOverlayBlur = unblurBlurAmount * (1 - unblurProgress);

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

      {/* Outer div: camera movement (3D rotations + scale) and enter/exit animations */}
      <div
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          filter: blur > 0 ? `blur(${blur}px)` : "none",
          opacity,
          position: "relative",
          width: displayWidth,
          height: displayHeight,
          zIndex: 1,
          overflow: "hidden",
        }}
      >
        {/* Inner div: zoom transform (scale + translate into the selected region) */}
        <div
          style={{
            transform: markingMode === "zoom" && zoomBox
              ? `scale(${zoomScale}) translate(${zoomTranslateX}%, ${zoomTranslateY}%)`
              : undefined,
            width: displayWidth,
            height: displayHeight,
            position: "relative",
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
        {imageSrc && markingMode !== "unblur" && markingMode !== "zoom" && (
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

        {/* Zoom mode: just show the image */}
        {imageSrc && markingMode === "zoom" && (
          <Img
            src={resolvedImageSrc}
            style={{
              width: displayWidth,
              height: displayHeight,
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 2,
            }}
          />
        )}

        {/* Unblur mode: blurred base + reveal sharp text */}
        {imageSrc && markingMode === "unblur" && (
          <>
            <Img
              src={resolvedImageSrc}
              style={{
                width: displayWidth,
                height: displayHeight,
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 2,
                filter: `blur(${unblurBlurAmount}px)`,
              }}
            />
            <UnblurReveal
              imageSrc={resolvedImageSrc}
              words={selectedWords}
              scaleFactor={scaleFactor}
              width={displayWidth}
              height={displayHeight}
              isActive={frame >= highlightStartFrame}
              opacity={unblurProgress}
              blurAmount={unblurOverlayBlur}
            />
          </>
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
      </div>

      {/* VCR Effect overlay - covers entire viewport */}
      {vcrEffect && <VCREffect intensity={0.6} isDarkMode={isDarkBackground(backgroundColor)} />}

      {/* Lower third attribution */}
      {attributionText && <LowerThird text={attributionText} />}

    </AbsoluteFill>
  );
};
