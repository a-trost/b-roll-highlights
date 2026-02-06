import { Composition } from "remotion";
import { HighlightComposition } from "./Composition";
import type { HighlightProps } from "../src/types";
import {
  DEFAULT_LEAD_IN_SECONDS,
  DEFAULT_LEAD_OUT_SECONDS,
  DEFAULT_CHARS_PER_SECOND,
  DEFAULT_UNBLUR_SECONDS,
  DEFAULT_ZOOM_DURATION_SECONDS,
  FPS,
  OUTPUT_DIMENSIONS,
} from "../src/types";

// Calculate the highlight animation duration based on character count
// Duration = total characters / charsPerSecond
function estimateHighlightDuration(props: HighlightProps, fps: number): number {
  const { selectedWords, charsPerSecond = DEFAULT_CHARS_PER_SECOND, markingMode, zoomDurationSeconds = DEFAULT_ZOOM_DURATION_SECONDS, zoomBox } = props;

  // For zoom mode, use the zoom duration
  if (markingMode === "zoom" && zoomBox) {
    return Math.ceil(zoomDurationSeconds * fps);
  }

  if (selectedWords.length === 0) {
    return fps * 2; // Default 2 seconds if no words
  }

  // Count total characters in all selected words
  const totalCharacters = selectedWords.reduce(
    (sum, word) => sum + word.text.length,
    0
  );

  // Calculate duration: chars / (chars per second) * fps = frames
  const durationInSeconds = totalCharacters / charsPerSecond;
  const framesNeeded = Math.ceil(durationInSeconds * fps);

  // Minimum 1 second for very short text
  return Math.max(fps, framesNeeded);
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HighlightVideo"
        component={HighlightComposition}
        durationInFrames={150}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          imageSrc: "",
          selectedWords: [],
          backgroundColor: [255, 255, 255] as [number, number, number],
          imageWidth: 1920,
          imageHeight: 1080,
          highlightColor: "rgba(255, 230, 0, 0.5)",
          markingMode: "highlight" as const,
          leadInSeconds: DEFAULT_LEAD_IN_SECONDS,
          charsPerSecond: DEFAULT_CHARS_PER_SECOND,
          leadOutSeconds: DEFAULT_LEAD_OUT_SECONDS,
          unblurSeconds: DEFAULT_UNBLUR_SECONDS,
          zoomBox: undefined,
          zoomDurationSeconds: DEFAULT_ZOOM_DURATION_SECONDS,
          blurredBackground: false,
          cameraMovement: "left-right" as const,
          enterAnimation: "blur" as const,
          exitAnimation: "none" as const,
          vcrEffect: false,
          attributionText: "",
          outputFormat: "landscape" as const,
          frameRate: 30 as const,
        }}
        calculateMetadata={({ props }) => {
          const typedProps = props as unknown as HighlightProps;
          const leadInSeconds =
            typedProps.leadInSeconds ?? DEFAULT_LEAD_IN_SECONDS;
          const leadOutSeconds =
            typedProps.leadOutSeconds ?? DEFAULT_LEAD_OUT_SECONDS;
          const exitAnimation = typedProps.exitAnimation ?? "none";
          const outputFormat = typedProps.outputFormat ?? "landscape";
          const fps = typedProps.frameRate ?? FPS;

          // Calculate lead-in frames (minimum 30 for animation)
          const leadInFrames = Math.max(30, Math.round(leadInSeconds * fps));
          const leadOutFrames = Math.round(leadOutSeconds * fps);

          // Add buffer for slide exit animations so fade completes before video ends
          const exitBuffer = (exitAnimation !== "blur" && exitAnimation !== "none") ? Math.round(fps / 2) : 0;

          // Estimate highlight animation duration
          const highlightFrames = estimateHighlightDuration(typedProps, fps);

          // Total duration = lead-in + highlight animation + lead-out + exit buffer
          const totalFrames = leadInFrames + highlightFrames + leadOutFrames + exitBuffer;

          // Get output dimensions based on format
          const dims = OUTPUT_DIMENSIONS[outputFormat];

          return {
            durationInFrames: totalFrames,
            fps,
            width: dims.width,
            height: dims.height,
            props,
          };
        }}
      />
    </>
  );
};
