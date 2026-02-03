import { Audio, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface MarkerSoundProps {
  startFrame: number;
  durationFrames: number;
}

export const MarkerSound: React.FC<MarkerSoundProps> = ({
  startFrame,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate volume - fade in at start, sustain, fade out at end
  const fadeInFrames = Math.min(10, durationFrames / 4);
  const fadeOutFrames = Math.min(15, durationFrames / 3);
  const fadeOutStart = startFrame + durationFrames - fadeOutFrames;

  const volume = interpolate(
    frame,
    [
      startFrame,
      startFrame + fadeInFrames,
      fadeOutStart,
      startFrame + durationFrames,
    ],
    [0, 0.4, 0.4, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Calculate playback rate to stretch/compress sound to match highlight duration
  // The marker.mp3 is about 0.26 seconds, so we adjust playback rate
  const soundDurationSeconds = 0.26;
  const targetDurationSeconds = durationFrames / fps;

  // Clamp playback rate to reasonable range (0.5x to 2x)
  // If highlight is longer than sound, we'll loop; if shorter, we speed up slightly
  const playbackRate = Math.max(0.7, Math.min(1.5, soundDurationSeconds / targetDurationSeconds));

  return (
    <Audio
      src={staticFile("sounds/marker.mp3")}
      startFrom={0}
      volume={volume}
      playbackRate={playbackRate}
    />
  );
};
