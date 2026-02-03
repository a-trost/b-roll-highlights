import type { WordBox } from "../../src/types";

interface SvgUnderlinerProps {
  words: WordBox[];
  animationFrame: number;
  totalHighlightFrames: number;
  scaleFactor: number;
  width: number;
  height: number;
  underlineColor: string;
  isDarkMode: boolean;
}

interface UnderlineSpan {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Custom easing for hand-drawing feel
function penDrawingEase(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Generate a hand-drawn underline path with slight waviness
function createHandDrawnUnderlinePath(
  startX: number,
  y: number,
  endX: number,
  seed: number,
  strokeWeight: number
): { path: string; length: number } {
  // Seeded random function for consistent randomness
  const seededRandom = (offset: number = 0) => {
    const x = Math.sin(seed * 9999 + offset) * 10000;
    return x - Math.floor(x);
  };

  const random = (min: number, max: number, offset: number = 0) => {
    return min + seededRandom(offset) * (max - min);
  };

  const lineLength = endX - startX;
  const segments = Math.max(8, Math.floor(lineLength / 20));
  const points: { x: number; y: number }[] = [];

  // Generate points along the line with subtle hand-drawn variation
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = startX + t * lineLength;

    // Add slight vertical waviness - more pronounced in the middle
    const waveAmount = strokeWeight * 0.3;
    const wave = Math.sin(t * Math.PI * 2 + seed) * waveAmount;

    // Add tiny random jitter
    const jitterY = random(-strokeWeight * 0.15, strokeWeight * 0.15, i * 2);
    const jitterX = random(-1, 1, i * 2 + 1);

    // Slight droop in the middle (like a real hand-drawn line)
    const droop = Math.sin(t * Math.PI) * strokeWeight * 0.2;

    points.push({
      x: x + jitterX,
      y: y + wave + jitterY + droop,
    });
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
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      path += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
    } else {
      path += ` L ${current.x.toFixed(2)} ${current.y.toFixed(2)}`;
    }
  }

  return { path, length };
}

export const SvgUnderliner: React.FC<SvgUnderlinerProps> = ({
  words,
  animationFrame,
  totalHighlightFrames,
  scaleFactor,
  width,
  height,
  underlineColor,
  isDarkMode,
}) => {
  if (words.length === 0) {
    return null;
  }

  // Group words into rows based on vertical overlap
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
  const spans: UnderlineSpan[] = [];

  for (const row of rows) {
    let currentSpan: UnderlineSpan | null = null;

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

  // Pre-calculate all paths and their data
  const pathsData = spans.map((span, index) => {
    const x = span.left * scaleFactor;
    const y = (span.bottom + 2) * scaleFactor; // Position slightly below the text
    const endX = span.right * scaleFactor;
    const h = (span.bottom - span.top) * scaleFactor;

    // Stroke weight based on text height
    const strokeWidth = Math.max(3, Math.min(6, h * 0.08));

    // Add small padding to extend beyond words
    const padding = h * 0.1;
    const { path, length } = createHandDrawnUnderlinePath(
      x - padding,
      y,
      endX + padding,
      index + 1,
      strokeWidth
    );

    return { path, length, strokeWidth };
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
        mixBlendMode: isDarkMode ? "screen" : "multiply",
      }}
    >
      <defs>
        {/* Soft blur filter for pen-like appearance */}
        <filter id="underlineBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.4" />
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
            stroke={underlineColor}
            strokeWidth={data.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dashArray}
            strokeDashoffset={0}
            filter="url(#underlineBlur)"
          />
        );
      })}
    </svg>
  );
};
