import { useEffect, useRef } from "react";
import rough from "roughjs";
import type { WordBox } from "../../src/types";

interface RoughHighlighterProps {
  words: WordBox[];
  animationFrame: number;
  totalHighlightFrames: number;
  scaleFactor: number;
  width: number;
  height: number;
  highlightColor: string;
}

interface HighlightSpan {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const RoughHighlighter: React.FC<RoughHighlighterProps> = ({
  words,
  animationFrame,
  totalHighlightFrames,
  scaleFactor,
  width,
  height,
  highlightColor,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || words.length === 0) return;

    // Clear previous drawings
    svgRef.current.innerHTML = "";

    const rc = rough.svg(svgRef.current);

    // Create defs for filters
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

    // Add blur filter for soft edges
    const filter = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "filter"
    );
    filter.id = "softBlur";
    filter.setAttribute("x", "-50%");
    filter.setAttribute("y", "-50%");
    filter.setAttribute("width", "200%");
    filter.setAttribute("height", "200%");

    const blur = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feGaussianBlur"
    );
    blur.setAttribute("in", "SourceGraphic");
    blur.setAttribute("stdDeviation", "3");
    filter.appendChild(blur);
    defs.appendChild(filter);

    svgRef.current.appendChild(defs);

    // Group words into rows based on vertical overlap
    const wordsCopy = [...words];
    const rows: (typeof words)[] = [];

    // Sort by top position first
    wordsCopy.sort((a, b) => a.top - b.top);

    for (const word of wordsCopy) {
      let foundRow = false;
      for (const row of rows) {
        const rowTop = Math.min(...row.map((w) => w.top));
        const rowBottom = Math.max(...row.map((w) => w.top + w.height));
        const wordBottom = word.top + word.height;

        // Words are on same row if they vertically overlap
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

    // Now group adjacent words within each row into spans
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
          // Check if adjacent (gap less than 3x word height)
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

    // Padding as a percentage of span height
    const PADDING_X_RATIO = 0.25; // 25% of height for horizontal padding
    const PADDING_Y_RATIO = 0.15; // 15% of height for vertical padding

    // Calculate total pixel width of all spans (with proportional padding)
    let totalPixelWidth = 0;
    for (const span of spans) {
      const w = (span.right - span.left) * scaleFactor;
      const h = (span.bottom - span.top) * scaleFactor;
      const paddingX = h * PADDING_X_RATIO;
      totalPixelWidth += w + paddingX * 2;
    }

    // Calculate progress based on time (character-based duration)
    const progress = Math.min(1, animationFrame / totalHighlightFrames);
    const distanceTraveled = progress * totalPixelWidth;

    // Create a group for all highlights with the blur filter
    const highlightGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );
    highlightGroup.setAttribute("filter", "url(#softBlur)");

    // Track cumulative distance as we go through spans
    let cumulativeDistance = 0;

    for (let i = 0; i < spans.length; i++) {
      const span = spans[i];

      // Scale coordinates
      const x = span.left * scaleFactor;
      const y = span.top * scaleFactor;
      const w = (span.right - span.left) * scaleFactor;
      const h = (span.bottom - span.top) * scaleFactor;

      // Calculate proportional padding based on span height
      const paddingX = h * PADDING_X_RATIO;
      const paddingY = h * PADDING_Y_RATIO;

      const spanWidth = w + paddingX * 2;

      // Check if we've reached this span yet
      if (distanceTraveled <= cumulativeDistance) {
        // Haven't reached this span yet
        break;
      }

      // Calculate how much of this span to draw
      const distanceIntoSpan = distanceTraveled - cumulativeDistance;
      const drawWidth = Math.min(spanWidth, distanceIntoSpan);

      // Extra space for blur effect, proportional to height
      const blurExtra = h * 0.2;

      // Create a clip path for partial reveal
      const clipId = `clip-${i}`;
      const clipPath = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "clipPath"
      );
      clipPath.id = clipId;
      const clipRect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      );
      clipRect.setAttribute("x", String(x - paddingX - blurExtra));
      clipRect.setAttribute("y", String(y - paddingY - blurExtra));
      clipRect.setAttribute("width", String(drawWidth + blurExtra));
      clipRect.setAttribute("height", String(h + paddingY * 2 + blurExtra * 2));
      clipPath.appendChild(clipRect);
      defs.appendChild(clipPath);

      // Draw rough rectangle with soft settings - no stroke
      const node = rc.rectangle(
        x - paddingX,
        y - paddingY,
        spanWidth,
        h + paddingY * 2,
        {
          fill: highlightColor,
          fillStyle: "solid",
          stroke: "none",
          strokeWidth: 0,
          roughness: 0.8,
          bowing: 1,
          seed: i + 1,
        }
      );

      node.setAttribute("clip-path", `url(#${clipId})`);
      highlightGroup.appendChild(node);

      // Add this span's width to cumulative distance
      cumulativeDistance += spanWidth;
    }

    svgRef.current.appendChild(highlightGroup);
  }, [words, animationFrame, totalHighlightFrames, scaleFactor, highlightColor]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 1,
        pointerEvents: "none",
      }}
    />
  );
};
