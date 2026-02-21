import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

interface TechLowerThirdProps {
  text: string;
}

export const TechLowerThird: React.FC<TechLowerThirdProps> = ({ text }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // Padding: 0.5s lead-in, 0.7s outro
  const animStart = Math.round(fps * 0.5);
  const animEnd = durationInFrames - Math.round(fps * 0.7);
  const animLength = animEnd - animStart;

  const enterEnd = animStart + animLength * 0.18;
  const exitStart = animStart + animLength * 0.82;
  const enterDur = enterEnd - animStart;
  const exitDur = animEnd - exitStart;

  const eIn = (frac: number) => animStart + enterDur * frac;
  const eOut = (frac: number) => exitStart + exitDur * frac;

  const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

  // ── Enter ──
  // 1. Thin accent line sweeps in from left
  const lineIn = interpolate(frame, [eIn(0), eIn(0.4)], [0, 1], {
    ...clamp, easing: Easing.out(Easing.cubic),
  });
  // 2. Backdrop fades + expands
  const panelIn = interpolate(frame, [eIn(0.12), eIn(0.6)], [0, 1], {
    ...clamp, easing: Easing.out(Easing.cubic),
  });
  // 3. Accent pip scales in
  const pipIn = interpolate(frame, [eIn(0.2), eIn(0.55)], [0, 1], {
    ...clamp, easing: Easing.out(Easing.back(2)),
  });
  // 4. Text slides up + fades
  const textIn = interpolate(frame, [eIn(0.3), eIn(0.8)], [0, 1], {
    ...clamp, easing: Easing.out(Easing.cubic),
  });
  // 5. Underline draws in
  const underlineIn = interpolate(frame, [eIn(0.5), eIn(1)], [0, 1], {
    ...clamp, easing: Easing.out(Easing.cubic),
  });

  // ── Exit (reverse order) ──
  const underlineOut = interpolate(frame, [eOut(0), eOut(0.3)], [1, 0], {
    ...clamp, easing: Easing.in(Easing.cubic),
  });
  const textOut = interpolate(frame, [eOut(0.08), eOut(0.45)], [1, 0], {
    ...clamp, easing: Easing.in(Easing.cubic),
  });
  const pipOut = interpolate(frame, [eOut(0.15), eOut(0.5)], [1, 0], {
    ...clamp, easing: Easing.in(Easing.cubic),
  });
  const panelOut = interpolate(frame, [eOut(0.3), eOut(0.75)], [1, 0], {
    ...clamp, easing: Easing.in(Easing.cubic),
  });
  const lineOut = interpolate(frame, [eOut(0.5), eOut(1)], [1, 0], {
    ...clamp, easing: Easing.in(Easing.cubic),
  });

  // ── Combine ──
  const fLine = Math.min(lineIn, lineOut);
  const fPanel = Math.min(panelIn, panelOut);
  const fPip = Math.min(pipIn, pipOut);
  const fText = Math.min(textIn, textOut);
  const fUnderline = Math.min(underlineIn, underlineOut);

  // Text slide offset (12px → 0 on enter, 0 → -8px on exit)
  const textSlideIn = interpolate(frame, [eIn(0.3), eIn(0.8)], [14, 0], {
    ...clamp, easing: Easing.out(Easing.cubic),
  });
  const textSlideOut = interpolate(frame, [eOut(0.08), eOut(0.45)], [0, -10], {
    ...clamp, easing: Easing.in(Easing.cubic),
  });
  const textSlide = frame < exitStart ? textSlideIn : textSlideOut;

  // ── Colors ──
  const accent = "#E8C6FE";        // lavender
  const accentDim = "#C9A0E8";     // slightly deeper for gradients
  const accentGlow = "rgba(232, 198, 254, 0.25)";

  // ── Dimensions ──
  const charW = 20.5;
  const panelPadLeft = 52;
  const panelPadRight = 36;
  const panelWidth = Math.max(320, text.length * charW + panelPadLeft + panelPadRight);
  const panelHeight = 68;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 90,
        left: 72,
        zIndex: 50,
      }}
    >
      {/* Soft glow behind panel */}
      <div
        style={{
          position: "absolute",
          top: -30,
          left: -30,
          width: panelWidth + 60,
          height: panelHeight + 60,
          background: `radial-gradient(ellipse at 20% 50%, rgba(232, 198, 254, ${0.06 * fPanel}) 0%, transparent 70%)`,
          filter: "blur(24px)",
          pointerEvents: "none",
        }}
      />

      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: 2,
          width: panelWidth * fLine,
          background: `linear-gradient(90deg, ${accent}, ${accentDim} 60%, transparent)`,
          boxShadow: fLine > 0.5 ? `0 0 10px ${accentGlow}` : "none",
        }}
      />

      {/* Main panel */}
      <div
        style={{
          marginTop: 2,
          width: panelWidth,
          height: panelHeight,
          overflow: "hidden",
          position: "relative",
          opacity: fPanel,
          clipPath: `inset(0 ${(1 - fPanel) * 100}% 0 0)`,
        }}
      >
        {/* Panel background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(160deg, rgba(15, 12, 20, 0.92) 0%, rgba(22, 18, 30, 0.88) 100%)",
            borderBottom: "1px solid rgba(232, 198, 254, 0.08)",
            borderRight: "1px solid rgba(255, 255, 255, 0.03)",
          }}
        />

        {/* Accent triangle (right-pointing) */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 20,
            width: 0,
            height: 0,
            borderLeft: `8px solid ${accent}`,
            borderTop: "5px solid transparent",
            borderBottom: "5px solid transparent",
            transform: `translateY(-50%) scale(${fPip})`,
            filter: `drop-shadow(0 0 6px ${accentGlow})`,
          }}
        />

        {/* Text */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: panelPadLeft,
            transform: `translateY(calc(-50% + ${textSlide}px))`,
            fontFamily,
            fontSize: 34,
            fontWeight: 500,
            color: "#FFFFFF",
            whiteSpace: "nowrap",
            opacity: fText,
            lineHeight: 1,
            letterSpacing: "0.01em",
          }}
        >
          {text}
        </div>
      </div>

      {/* Bottom accent underline */}
      <div
        style={{
          position: "absolute",
          bottom: -1,
          left: 0,
          height: 1,
          width: (panelWidth * 0.35) * fUnderline,
          background: `linear-gradient(90deg, ${accent}, transparent)`,
          opacity: 0.5,
        }}
      />
    </div>
  );
};
