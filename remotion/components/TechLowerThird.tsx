import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

interface TechLowerThirdProps {
  text: string;
}

export const TechLowerThird: React.FC<TechLowerThirdProps> = ({ text }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // ── Timing ──
  const animStart = Math.round(fps * 0.5);
  const animEnd = durationInFrames - Math.round(fps * 0.7);
  const animLength = animEnd - animStart;

  const enterEnd = animStart + animLength * 0.22;
  const exitStart = animStart + animLength * 0.78;
  const enterDur = enterEnd - animStart;
  const exitDur = animEnd - exitStart;

  const eIn = (frac: number) => animStart + enterDur * frac;
  const eOut = (frac: number) => exitStart + exitDur * frac;

  const c = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

  // ── Enter animations (staggered, overlapping) ──

  // 0. Vertical accent bar slides up from bottom
  const barIn = interpolate(frame, [eIn(0), eIn(0.35)], [0, 1], {
    ...c, easing: Easing.out(Easing.cubic),
  });
  // 1. Thin horizontal wipe line fires across
  const wipeIn = interpolate(frame, [eIn(0.08), eIn(0.45)], [0, 1], {
    ...c, easing: Easing.out(Easing.exp),
  });
  // 2. Panel reveals (clip-path from left)
  const panelIn = interpolate(frame, [eIn(0.15), eIn(0.6)], [0, 1], {
    ...c, easing: Easing.out(Easing.cubic),
  });
  // 3. Text fades + slides in
  const textIn = interpolate(frame, [eIn(0.35), eIn(0.85)], [0, 1], {
    ...c, easing: Easing.out(Easing.cubic),
  });
  // 4. Corner brackets snap in with overshoot
  const bracketIn = interpolate(frame, [eIn(0.4), eIn(0.75)], [0, 1], {
    ...c, easing: Easing.out(Easing.back(1.8)),
  });
  // 5. Bottom edge line draws in
  const edgeIn = interpolate(frame, [eIn(0.5), eIn(1)], [0, 1], {
    ...c, easing: Easing.out(Easing.cubic),
  });

  // ── Exit animations (reverse stagger) ──
  const edgeOut = interpolate(frame, [eOut(0), eOut(0.25)], [1, 0], {
    ...c, easing: Easing.in(Easing.cubic),
  });
  const bracketOut = interpolate(frame, [eOut(0.05), eOut(0.3)], [1, 0], {
    ...c, easing: Easing.in(Easing.cubic),
  });
  const textOut = interpolate(frame, [eOut(0.1), eOut(0.45)], [1, 0], {
    ...c, easing: Easing.in(Easing.cubic),
  });
  const panelOut = interpolate(frame, [eOut(0.25), eOut(0.7)], [1, 0], {
    ...c, easing: Easing.in(Easing.cubic),
  });
  const wipeOut = interpolate(frame, [eOut(0.4), eOut(0.85)], [1, 0], {
    ...c, easing: Easing.in(Easing.exp),
  });
  const barOut = interpolate(frame, [eOut(0.55), eOut(1)], [1, 0], {
    ...c, easing: Easing.in(Easing.cubic),
  });

  // ── Combine ──
  const fBar = Math.min(barIn, barOut);
  const fWipe = Math.min(wipeIn, wipeOut);
  const fPanel = Math.min(panelIn, panelOut);
  const fText = Math.min(textIn, textOut);
  const fBracket = Math.min(bracketIn, bracketOut);
  const fEdge = Math.min(edgeIn, edgeOut);

  // Text slide (enters from right, exits to left)
  const textSlideIn = interpolate(frame, [eIn(0.35), eIn(0.85)], [30, 0], {
    ...c, easing: Easing.out(Easing.cubic),
  });
  const textSlideOut = interpolate(frame, [eOut(0.1), eOut(0.45)], [0, -20], {
    ...c, easing: Easing.in(Easing.cubic),
  });
  const textSlide = frame < exitStart ? textSlideIn : textSlideOut;

  // Bar slide (enters from below)
  const barSlide = interpolate(frame, [eIn(0), eIn(0.35)], [40, 0], {
    ...c, easing: Easing.out(Easing.cubic),
  });
  const barSlideOut = interpolate(frame, [eOut(0.55), eOut(1)], [0, 40], {
    ...c, easing: Easing.in(Easing.cubic),
  });
  const barY = frame < exitStart ? barSlide : barSlideOut;

  // ── Hold phase: shimmer sweep ──
  const holdStart = enterEnd;
  const holdEnd = exitStart;
  const holdProgress = interpolate(frame, [holdStart, holdEnd], [0, 1], c);
  // Repeating sweep: cycles every ~2.5s
  const sweepCycle = (holdProgress * (animLength / fps) / 2.5) % 1;
  const shimmerX = interpolate(sweepCycle, [0, 1], [-100, 200], c);

  // ── Colors ──
  const accent = "#E8C6FE";
  const accentBright = "#F0DAFF";
  const accentDeep = "#B088D4";
  const accentGlow = "rgba(232, 198, 254, 0.35)";

  // ── Dimensions ──
  const charW = 21;
  const barWidth = 5;
  const panelPadLeft = 28;
  const panelPadRight = 44;
  const panelWidth = Math.max(360, text.length * charW + panelPadLeft + panelPadRight);
  const panelHeight = 72;
  const totalWidth = barWidth + panelWidth;
  const bracketSize = 14;
  const bracketWeight = 2;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 90,
        left: 72,
        zIndex: 50,
        width: totalWidth,
        height: panelHeight,
      }}
    >
      {/* ── Ambient glow ── */}
      <div
        style={{
          position: "absolute",
          top: -40,
          left: -40,
          width: totalWidth + 80,
          height: panelHeight + 80,
          background: `radial-gradient(ellipse at 10% 60%, rgba(232, 198, 254, ${0.08 * fPanel}) 0%, transparent 65%)`,
          filter: "blur(30px)",
          pointerEvents: "none",
        }}
      />

      {/* ── Left accent bar ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: barWidth,
          height: panelHeight,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: barWidth,
            height: panelHeight,
            background: `linear-gradient(180deg, ${accentBright} 0%, ${accent} 40%, ${accentDeep} 100%)`,
            transform: `translateY(${barY}px)`,
            opacity: fBar,
            boxShadow: `4px 0 20px ${accentGlow}, 0 0 8px rgba(232, 198, 254, 0.15)`,
          }}
        />
      </div>

      {/* ── Horizontal wipe line (fires across before panel opens) ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: barWidth,
          width: panelWidth,
          height: 1,
          overflow: "hidden",
          opacity: fWipe > 0.01 && fWipe < 0.99 ? 1 : 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: panelWidth * 0.6,
            height: 1,
            background: `linear-gradient(90deg, ${accent}, transparent)`,
            transform: `translateX(${fWipe * panelWidth * 0.8}px)`,
          }}
        />
      </div>

      {/* ── Main panel ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: barWidth,
          width: panelWidth,
          height: panelHeight,
          overflow: "hidden",
          clipPath: `inset(0 ${(1 - fPanel) * 100}% 0 0)`,
        }}
      >
        {/* Panel background — layered for depth */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(12, 10, 18, 0.94) 0%, rgba(18, 14, 26, 0.90) 50%, rgba(14, 11, 22, 0.92) 100%)",
          }}
        />
        {/* Inner edge highlights */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderTop: `1px solid rgba(232, 198, 254, 0.12)`,
            borderRight: `1px solid rgba(255, 255, 255, 0.04)`,
            borderBottom: `1px solid rgba(255, 255, 255, 0.02)`,
          }}
        />
        {/* Subtle inner gradient for glass feel */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(232, 198, 254, 0.04) 0%, transparent 40%, transparent 80%, rgba(0, 0, 0, 0.15) 100%)",
          }}
        />

        {/* ── Shimmer sweep (hold phase only) ── */}
        {frame > holdStart && frame < holdEnd && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: `linear-gradient(105deg, transparent ${shimmerX - 30}%, rgba(232, 198, 254, 0.06) ${shimmerX - 10}%, rgba(232, 198, 254, 0.10) ${shimmerX}%, rgba(232, 198, 254, 0.06) ${shimmerX + 10}%, transparent ${shimmerX + 30}%)`,
              pointerEvents: "none",
            }}
          />
        )}

        {/* ── Corner brackets (top-right and bottom-right) ── */}
        {/* Top-right bracket */}
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: bracketSize,
            height: bracketSize,
            borderTop: `${bracketWeight}px solid ${accent}`,
            borderRight: `${bracketWeight}px solid ${accent}`,
            opacity: fBracket * 0.6,
            transform: `scale(${fBracket})`,
          }}
        />
        {/* Bottom-right bracket */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            width: bracketSize,
            height: bracketSize,
            borderBottom: `${bracketWeight}px solid ${accent}`,
            borderRight: `${bracketWeight}px solid ${accent}`,
            opacity: fBracket * 0.6,
            transform: `scale(${fBracket})`,
          }}
        />

        {/* ── Text ── */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: panelPadLeft,
            right: panelPadRight,
            transform: `translateY(-50%) translateX(${textSlide}px)`,
            fontFamily,
            fontSize: 36,
            fontWeight: 600,
            color: "#FFFFFF",
            whiteSpace: "nowrap",
            opacity: fText,
            lineHeight: 1,
            letterSpacing: "0.02em",
            textShadow: `0 2px 8px rgba(0, 0, 0, 0.5)`,
          }}
        >
          {text}
        </div>
      </div>

      {/* ── Bottom edge glow line ── */}
      <div
        style={{
          position: "absolute",
          bottom: -1,
          left: barWidth,
          height: 1,
          width: panelWidth * 0.5 * fEdge,
          background: `linear-gradient(90deg, ${accent} 0%, ${accentDeep} 60%, transparent 100%)`,
          opacity: 0.45,
          boxShadow: fEdge > 0.3 ? `0 0 6px rgba(232, 198, 254, 0.2)` : "none",
        }}
      />

      {/* ── Top accent line (full width, appears after panel) ── */}
      <div
        style={{
          position: "absolute",
          top: -2,
          left: barWidth,
          height: 2,
          width: panelWidth * fEdge,
          background: `linear-gradient(90deg, ${accentBright}, ${accent} 30%, ${accentDeep} 70%, transparent)`,
          opacity: 0.7,
          boxShadow: fEdge > 0.3 ? `0 0 12px ${accentGlow}` : "none",
        }}
      />
    </div>
  );
};
