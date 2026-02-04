import type { WordBox } from "../../src/types";

interface UnblurRevealProps {
  imageSrc: string;
  words: WordBox[];
  scaleFactor: number;
  width: number;
  height: number;
  isActive: boolean;
  opacity: number;
  blurAmount: number;
}

interface HighlightSpan {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const PADDING_X_RATIO = 0.12;
const PADDING_Y_RATIO = 0.08;

export const UnblurReveal: React.FC<UnblurRevealProps> = ({
  imageSrc,
  words,
  scaleFactor,
  width,
  height,
  isActive,
  opacity,
  blurAmount,
}) => {
  if (!imageSrc || words.length === 0 || !isActive) {
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

  // Sort rows by vertical position, and words within each row by left position
  rows.sort(
    (a, b) =>
      Math.min(...a.map((w) => w.top)) - Math.min(...b.map((w) => w.top))
  );
  for (const row of rows) {
    row.sort((a, b) => a.left - b.left);
  }

  // Group adjacent words within each row into spans
  const spans: HighlightSpan[] = [];

  for (const row of rows) {
    let currentSpan: HighlightSpan | null = null;

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

  // Calculate reveal rectangles for all spans
  const spanMetrics = spans.map((span) => {
    const w = (span.right - span.left) * scaleFactor;
    const h = (span.bottom - span.top) * scaleFactor;
    const paddingX = Math.min(h * PADDING_X_RATIO, w * 0.15);
    const paddingY = h * PADDING_Y_RATIO;

    return {
      span,
      paddingX,
      paddingY,
      width: w,
      height: h,
    };
  });

  // Build reveal rectangles
  const revealRects: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];

  for (const span of spanMetrics) {
    const { paddingX, paddingY, width: w, height: h } = span;
    const { left, top } = span.span;

    const x = left * scaleFactor - paddingX;
    const y = top * scaleFactor - paddingY;

    revealRects.push({
      x,
      y,
      width: w + paddingX * 2,
      height: h + paddingY * 2,
    });
  }

  const maskId = "unblur-mask";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 3,
        pointerEvents: "none",
        opacity,
        filter: blurAmount > 0 ? `blur(${blurAmount}px)` : "none",
      }}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect width={width} height={height} fill="black" />
          {revealRects.map((rect, index) => (
            <rect
              key={`reveal-${index}`}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill="white"
            />
          ))}
        </mask>
      </defs>
      <image
        href={imageSrc}
        width={width}
        height={height}
        mask={`url(#${maskId})`}
        preserveAspectRatio="xMinYMin meet"
      />
    </svg>
  );
};
