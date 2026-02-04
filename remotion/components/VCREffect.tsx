import { useCurrentFrame, random } from "remotion";

interface VCREffectProps {
  intensity?: number; // 0-1, controls overall effect strength
  isDarkMode?: boolean; // true for dark backgrounds
}

export const VCREffect: React.FC<VCREffectProps> = ({ intensity = 0.6, isDarkMode = false }) => {
  const frame = useCurrentFrame();

  // Generate pseudo-random values for this frame
  const noiseOffset = random(`noise-${frame}`) * 1000;

  // Subtle vertical jitter
  const jitterY = (random(`jitter-${frame}`) - 0.5) * 2 * intensity;

  // Colors adapt based on background brightness
  const scanlineColor = isDarkMode ? "255, 255, 255" : "0, 0, 0";
  const scanlineOpacity = isDarkMode ? 0.12 : 0.18;
  const bandOpacity = isDarkMode ? 0.03 : 0.05;
  const vignetteColor = isDarkMode ? "0, 0, 0" : "0, 0, 0"; // Vignette stays dark
  const edgeColor = isDarkMode ? "0, 0, 0" : "0, 0, 0"; // Edges stay dark
  const tintColor = isDarkMode ? "rgba(100, 200, 255, 0.03)" : "rgba(0, 255, 200, 0.02)";

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 100,
        transform: `translateY(${jitterY}px)`,
      }}
    >
      {/* Scanlines */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `repeating-linear-gradient(
            0deg,
            rgba(${scanlineColor}, ${scanlineOpacity * intensity}) 0px,
            rgba(${scanlineColor}, ${scanlineOpacity * intensity}) 1px,
            transparent 1px,
            transparent 2px
          )`,
          mixBlendMode: isDarkMode ? "soft-light" : "normal",
          pointerEvents: "none",
        }}
      />

      {/* Larger scanline bands */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `repeating-linear-gradient(
            0deg,
            transparent 0px,
            transparent 4px,
            rgba(${scanlineColor}, ${bandOpacity * intensity}) 4px,
            rgba(${scanlineColor}, ${bandOpacity * intensity}) 8px
          )`,
          mixBlendMode: isDarkMode ? "soft-light" : "normal",
          pointerEvents: "none",
        }}
      />

      {/* Chromatic aberration effect - subtle RGB shift */}
      <svg
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          mixBlendMode: "screen",
          opacity: 0.04 * intensity,
        }}
      >
        <defs>
          <filter id="chromatic">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="red"
            />
            <feOffset in="red" dx={3 * intensity} dy={0} result="redShift" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="green"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              result="blue"
            />
            <feOffset in="blue" dx={-3 * intensity} dy={0} result="blueShift" />
            <feBlend mode="screen" in="redShift" in2="green" result="rg" />
            <feBlend mode="screen" in="rg" in2="blueShift" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="white" filter="url(#chromatic)" />
      </svg>

      {/* Static noise overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: (isDarkMode ? 0.1 : 0.06) * intensity,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundPosition: `${noiseOffset}px ${noiseOffset}px`,
          mixBlendMode: isDarkMode ? "overlay" : "normal",
          pointerEvents: "none",
        }}
      />

      {/* Vignette effect */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `radial-gradient(
            ellipse at center,
            transparent 0%,
            transparent 60%,
            rgba(${vignetteColor}, ${0.4 * intensity}) 100%
          )`,
          pointerEvents: "none",
        }}
      />

      {/* Subtle color tint - slight blue/green CRT phosphor look */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: tintColor,
          mixBlendMode: isDarkMode ? "screen" : "overlay",
          opacity: intensity,
          pointerEvents: "none",
        }}
      />

      {/* Top and bottom edge distortion */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 8,
          background: `linear-gradient(
            180deg,
            rgba(${edgeColor}, ${0.5 * intensity}) 0%,
            transparent 100%
          )`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: 8,
          background: `linear-gradient(
            0deg,
            rgba(${edgeColor}, ${0.5 * intensity}) 0%,
            transparent 100%
          )`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
