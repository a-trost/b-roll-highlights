import { Composition } from "remotion";
import { HighlightComposition } from "./Composition";
import type { HighlightProps } from "../src/types";
import {
  DEFAULT_LEAD_IN_SECONDS,
  DEFAULT_LEAD_OUT_SECONDS,
  DEFAULT_CHARS_PER_SECOND,
  DEFAULT_UNBLUR_SECONDS,
  FPS,
} from "../src/types";

// Calculate the highlight animation duration based on character count
// Duration = total characters / charsPerSecond
function estimateHighlightDuration(props: HighlightProps): number {
  const { selectedWords, charsPerSecond = DEFAULT_CHARS_PER_SECOND } = props;

  if (selectedWords.length === 0) {
    return 60; // Default 2 seconds if no words
  }

  // Count total characters in all selected words
  const totalCharacters = selectedWords.reduce(
    (sum, word) => sum + word.text.length,
    0
  );

  // Calculate duration: chars / (chars per second) * FPS = frames
  const durationInSeconds = totalCharacters / charsPerSecond;
  const framesNeeded = Math.ceil(durationInSeconds * FPS);

  // Minimum 1 second (30 frames) for very short text
  return Math.max(30, framesNeeded);
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
          blurredBackground: false,
          cameraMovement: "left-right" as const,
          blurMode: "blur-in" as const,
          vcrEffect: false,
          attributionText: "",
        }}
        calculateMetadata={({ props }) => {
          const typedProps = props as unknown as HighlightProps;
          const leadInSeconds =
            typedProps.leadInSeconds ?? DEFAULT_LEAD_IN_SECONDS;
          const leadOutSeconds =
            typedProps.leadOutSeconds ?? DEFAULT_LEAD_OUT_SECONDS;

          // Calculate lead-in frames (minimum 30 for blur animation)
          const leadInFrames = Math.max(30, Math.round(leadInSeconds * FPS));
          const leadOutFrames = Math.round(leadOutSeconds * FPS);

          // Estimate highlight animation duration
          const highlightFrames = estimateHighlightDuration(typedProps);

          // Total duration = lead-in + highlight animation + lead-out
          const totalFrames = leadInFrames + highlightFrames + leadOutFrames;

          return {
            durationInFrames: totalFrames,
            props,
          };
        }}
      />
    </>
  );
};
