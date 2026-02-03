import type { WordBox } from "../../src/types";

interface SvgCirclerProps {
  words: WordBox[];
  animationFrame: number;
  totalHighlightFrames: number;
  scaleFactor: number;
  width: number;
  height: number;
  circleColor: string;
}

interface CircleSpan {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Custom easing that feels like hand-drawing a circle
// Uses a smooth ease-out curve - starts at normal speed, gradually slows down
// This mimics how someone draws: confident start, careful finish
function penDrawingEase(t: number): number {
  // Ease-out cubic: starts faster, slows down at end (like pen lifting off paper)
  // f(t) = 1 - (1-t)^3
  return 1 - Math.pow(1 - t, 3);
}

// Generate a hand-drawn squircle path (superellipse) with slight imperfections
// A squircle is between a circle and a rounded rectangle - smooth and organic
function createHandDrawnSquirclePath(
  cx: number,
  cy: number,
  halfWidth: number,
  halfHeight: number,
  seed: number
): { path: string; length: number } {
  // Seeded random function for consistent randomness per span
  const seededRandom = (offset: number = 0) => {
    const x = Math.sin(seed * 9999 + offset) * 10000;
    return x - Math.floor(x);
  };

  const random = (min: number, max: number, offset: number = 0) => {
    return min + seededRandom(offset) * (max - min);
  };

  // Squircle exponent - higher = more rectangular, lower = more circular
  // 2.0 = ellipse, 4.0 = squircle, higher = more rectangular
  const n = 3.5;

  // Number of segments for smooth curve
  const segments = 32;
  const points: { x: number; y: number }[] = [];

  // Generate points along the superellipse with hand-drawn imperfections
  // Start slightly past top-center for overlap effect
  const startAngle = -Math.PI / 2 + 0.15;
  // Go slightly past full circle for overlap
  const endAngle = startAngle + Math.PI * 2 * 1.08;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + t * (endAngle - startAngle);

    // Superellipse formula: x = a * sign(cos(θ)) * |cos(θ)|^(2/n)
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const signX = cosA >= 0 ? 1 : -1;
    const signY = sinA >= 0 ? 1 : -1;

    let baseX = signX * Math.pow(Math.abs(cosA), 2 / n) * halfWidth;
    let baseY = signY * Math.pow(Math.abs(sinA), 2 / n) * halfHeight;

    // Add hand-drawn jitter
    const jitterAmount = 0.025;
    const jitterX = random(-halfWidth * jitterAmount, halfWidth * jitterAmount, i * 3);
    const jitterY = random(-halfHeight * jitterAmount, halfHeight * jitterAmount, i * 3 + 1);

    // Add subtle waviness
    const waveX = Math.sin(angle * 5 + seed) * halfWidth * 0.015;
    const waveY = Math.cos(angle * 4 + seed) * halfHeight * 0.015;

    const x = cx + baseX + jitterX + waveX;
    const y = cy + baseY + jitterY + waveY;

    points.push({ x, y });
  }

  // Build SVG path using quadratic curves for smoothness
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  let length = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const current = points[i];

    // Calculate segment length
    const dx = current.x - prev.x;
    const dy = current.y - prev.y;
    length += Math.sqrt(dx * dx + dy * dy);

    if (i < points.length - 1) {
      const next = points[i + 1];
      // Use quadratic curve through midpoint for smoothness
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      path += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
    } else {
      // Final segment
      path += ` L ${current.x.toFixed(2)} ${current.y.toFixed(2)}`;
    }
  }

  // Adjust length for curves
  length *= 1.1;

  return { path, length };
}

export const SvgCircler: React.FC<SvgCirclerProps> = ({
  words,
  animationFrame,
  totalHighlightFrames,
  scaleFactor,
  width,
  height,
  circleColor,
}) => {
  if (words.length === 0) {
    return null;
  }

  // Group words into rows based on vertical overlap (same logic as RoughHighlighter)
  const wordsCopy = [...words];
  const rows: (typeof words)[] = [];

  wordsCopy.sort((a, b) => a.top - b.top);

  for (const word of wordsCopy) {
    let foundRow = false;
    for (const row of rows) {
      const rowTop = Math.min(...row.map((w) => w.top));
      const rowBottom = Math.max(...row.map((w) => w.top + w.height));
      const wordBottom = word.top + word.height;

      const overlaps = word.top < rowBottom && wordBottom > rowTop;
      if (overlaps) {
        row.push(word);
        foundRow = true;
        break;
      }
    }
    if (!foundRow) {
      rows.push([word]);
    }
  }

  // Sort rows and words within rows
  rows.sort(
    (a, b) =>
      Math.min(...a.map((w) => w.top)) - Math.min(...b.map((w) => w.top))
  );
  for (const row of rows) {
    row.sort((a, b) => a.left - b.left);
  }

  // Group adjacent words into spans
  const spans: CircleSpan[] = [];

  for (const row of rows) {
    let currentSpan: CircleSpan | null = null;

    for (const word of row) {
      const wordRight = word.left + word.width;
      const wordBottom = word.top + word.height;

      if (currentSpan === null) {
        currentSpan = {
          left: word.left,
          top: word.top,
          right: wordRight,
          bottom: wordBottom,
        };
      } else {
        const avgHeight =
          (currentSpan.bottom - currentSpan.top + word.height) / 2;
        const gap = word.left - currentSpan.right;
        const isAdjacent = gap < avgHeight * 3;

        if (isAdjacent) {
          currentSpan.right = wordRight;
          currentSpan.top = Math.min(currentSpan.top, word.top);
          currentSpan.bottom = Math.max(currentSpan.bottom, wordBottom);
        } else {
          spans.push(currentSpan);
          currentSpan = {
            left: word.left,
            top: word.top,
            right: wordRight,
            bottom: wordBottom,
          };
        }
      }
    }

    if (currentSpan) {
      spans.push(currentSpan);
    }
  }

  // Calculate animation progress
  const progress = Math.min(1, animationFrame / totalHighlightFrames);
  const totalSpans = spans.length;

  // Padding as percentage of height
  const PADDING_RATIO = 0.3;

  // Pre-calculate all paths and their data
  const pathsData = spans.map((span, index) => {
    const x = span.left * scaleFactor;
    const y = span.top * scaleFactor;
    const w = (span.right - span.left) * scaleFactor;
    const h = (span.bottom - span.top) * scaleFactor;

    const padding = h * PADDING_RATIO;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const halfWidth = w / 2 + padding;
    const halfHeight = h / 2 + padding * 0.6;

    const { path, length } = createHandDrawnSquirclePath(cx, cy, halfWidth, halfHeight, index + 1);
    const strokeWidth = Math.max(2.5, h * 0.07);

    return { path, length, strokeWidth, h };
  });

  return (
    <svg
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 3,
        pointerEvents: "none",
        mixBlendMode: "multiply",
      }}
    >
      <defs>
        {/* Soft blur filter for pen-like appearance */}
        <filter id="penBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" />
        </filter>
      </defs>

      {pathsData.map((data, index) => {
        // Calculate this span's animation progress
        const spanStart = index / totalSpans;
        const spanEnd = (index + 1) / totalSpans;
        const linearProgress = Math.max(
          0,
          Math.min(1, (progress - spanStart) / (spanEnd - spanStart))
        );

        if (linearProgress <= 0) {
          return null;
        }

        // Apply easing for natural pen-drawing feel
        const easedProgress = penDrawingEase(linearProgress);

        // Animate stroke using dasharray/dashoffset
        const visibleLength = data.length * easedProgress;
        const dashArray = `${visibleLength} ${data.length}`;

        return (
          <path
            key={index}
            d={data.path}
            fill="none"
            stroke={circleColor}
            strokeWidth={data.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dashArray}
            strokeDashoffset={0}
            filter="url(#penBlur)"
          />
        );
      })}
    </svg>
  );
};
