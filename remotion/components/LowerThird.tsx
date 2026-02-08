import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

interface LowerThirdProps {
  text: string;
  bgColor?: string;
  textColor?: string;
}

export const LowerThird: React.FC<LowerThirdProps> = ({ text, bgColor = "#E8C6FE", textColor = "#333333" }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Animation timing
  const enterStartFrame = Math.round(1.5 * fps); // Start at 1.5 seconds
  const enterDuration = 20; // frames for enter animation
  const exitDuration = 15; // frames for exit animation
  const exitStartFrame = durationInFrames - exitDuration - Math.round(0.5 * fps); // Exit 0.5s before end

  // Calculate opacity and position for enter/exit animations
  const enterProgress = interpolate(
    frame,
    [enterStartFrame, enterStartFrame + enterDuration],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  const exitProgress = interpolate(
    frame,
    [exitStartFrame, exitStartFrame + exitDuration],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.cubic),
    }
  );

  // Combine enter and exit - use minimum to handle both
  const visibility = Math.min(enterProgress, exitProgress);

  // Slide in from left, slide out to left
  const translateX = interpolate(visibility, [0, 1], [-20, 0]);

  // Don't render if not visible yet or already gone
  if (visibility <= 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: 40,
        zIndex: 50,
        opacity: visibility,
        transform: `translateX(${translateX}px)`,
      }}
    >
      <div
        style={{
          backgroundColor: bgColor,
          color: textColor,
          padding: "10px 18px",
          borderRadius: 6,
          fontSize: 24,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontWeight: 500,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        }}
      >
        {text}
      </div>
    </div>
  );
};
