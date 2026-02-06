import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { WordBox, MarkingMode, ZoomBox, OutputFormat } from '../types';
import { OUTPUT_DIMENSIONS } from '../types';

interface WordSelectorProps {
  imageSrc: string;
  words: WordBox[];
  selectedWords: WordBox[];
  onSelectionChange: (words: WordBox[]) => void;
  zoomBox: ZoomBox | null;
  onZoomBoxChange: (zoomBox: ZoomBox | null) => void;
  imageWidth: number;
  imageHeight: number;
  markingMode: MarkingMode;
  highlightColor: string;
  outputFormat: OutputFormat;
  onNewImage: () => void;
}

export const WordSelector: React.FC<WordSelectorProps> = ({
  imageSrc,
  words,
  selectedWords,
  onSelectionChange,
  zoomBox,
  onZoomBoxChange,
  imageWidth,
  imageHeight,
  markingMode,
  highlightColor,
  outputFormat = 'landscape',
  onNewImage,
}) => {
  interface WordEntry {
    word: WordBox;
    index: number;
  }

  interface DragState {
    startOrderIndex: number;
    currentOrderIndex: number;
    startWordIndex: number;
    hasMoved: boolean;
    baseSelection: WordBox[];
  }

  interface ZoomDragState {
    startX: number;  // normalized 0-1
    startY: number;  // normalized 0-1
    currentX: number;
    currentY: number;
  }

  interface ZoomMoveState {
    offsetX: number; // offset from box origin to click point (normalized)
    offsetY: number;
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const [displayScale, setDisplayScale] = useState(1);
  const dragStateRef = useRef<DragState | null>(null);
  const zoomDragStateRef = useRef<ZoomDragState | null>(null);
  const zoomMoveStateRef = useRef<ZoomMoveState | null>(null);
  const [zoomDragPreview, setZoomDragPreview] = useState<ZoomBox | null>(null);

  const setDragState = useCallback((next: DragState | null) => {
    dragStateRef.current = next;
  }, []);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setDisplayScale(containerWidth / imageWidth);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [imageWidth]);

  const toggleWord = useCallback((word: WordBox) => {
    const isSelected = selectedWords.some(
      (w) =>
        w.left === word.left &&
        w.top === word.top &&
        w.text === word.text
    );

    if (isSelected) {
      onSelectionChange(
        selectedWords.filter(
          (w) =>
            !(
              w.left === word.left &&
              w.top === word.top &&
              w.text === word.text
            )
        )
      );
    } else {
      onSelectionChange([...selectedWords, word]);
    }
  }, [onSelectionChange, selectedWords]);

  const isWordSelected = (word: WordBox) => {
    return selectedWords.some(
      (w) =>
        w.left === word.left &&
        w.top === word.top &&
        w.text === word.text
    );
  };

  const sortWordEntries = useCallback((source: WordBox[]): WordEntry[] => {
    if (source.length === 0) return [];

    const entries: WordEntry[] = source.map((word, index) => ({ word, index }));
    const rows: WordEntry[][] = [];

    entries.sort((a, b) => a.word.top - b.word.top);

    for (const entry of entries) {
      let foundRow = false;
      for (const row of rows) {
        const rowTop = Math.min(...row.map((w) => w.word.top));
        const rowBottom = Math.max(...row.map((w) => w.word.top + w.word.height));
        const wordBottom = entry.word.top + entry.word.height;

        const overlaps = entry.word.top < rowBottom && wordBottom > rowTop;
        if (overlaps) {
          row.push(entry);
          foundRow = true;
          break;
        }
      }

      if (!foundRow) {
        rows.push([entry]);
      }
    }

    rows.sort(
      (a, b) =>
        Math.min(...a.map((w) => w.word.top)) -
        Math.min(...b.map((w) => w.word.top))
    );
    for (const row of rows) {
      row.sort((a, b) => a.word.left - b.word.left);
    }

    return rows.flatMap((row) => row);
  }, []);

  const getWordKey = useCallback((word: WordBox) => {
    return `${word.left}:${word.top}:${word.text}`;
  }, []);

  const mergeSelection = useCallback(
    (base: WordBox[], range: WordBox[]) => {
      const seen = new Set<string>();
      const merged: WordBox[] = [];

      for (const word of base) {
        const key = getWordKey(word);
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(word);
        }
      }

      for (const word of range) {
        const key = getWordKey(word);
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(word);
        }
      }

      return merged;
    },
    [getWordKey]
  );

  const sortedSelectedWords = useMemo(
    () => sortWordEntries(selectedWords).map((entry) => entry.word),
    [selectedWords, sortWordEntries]
  );

  const orderedWordEntries = useMemo(
    () => sortWordEntries(words),
    [words, sortWordEntries]
  );

  const orderIndexByWordIndex = useMemo(() => {
    const map = new Map<number, number>();
    orderedWordEntries.forEach((entry, orderIndex) => {
      map.set(entry.index, orderIndex);
    });
    return map;
  }, [orderedWordEntries]);

  const getRangeWords = useCallback(
    (startOrderIndex: number, endOrderIndex: number) => {
      if (orderedWordEntries.length === 0) return [];
      const minIndex = Math.min(startOrderIndex, endOrderIndex);
      const maxIndex = Math.max(startOrderIndex, endOrderIndex);
      return orderedWordEntries
        .slice(minIndex, maxIndex + 1)
        .map((entry) => entry.word);
    },
    [orderedWordEntries]
  );

  const handleWordPointerDown = useCallback(
    (wordIndex: number) => (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const orderIndex = orderIndexByWordIndex.get(wordIndex);
      if (orderIndex === undefined) return;
      setDragState({
        startOrderIndex: orderIndex,
        currentOrderIndex: orderIndex,
        startWordIndex: wordIndex,
        hasMoved: false,
        baseSelection: selectedWords,
      });
    },
    [orderIndexByWordIndex, selectedWords, setDragState]
  );

  const handleWordPointerEnter = useCallback(
    (wordIndex: number) => {
      const current = dragStateRef.current;
      if (!current) return;
      const orderIndex = orderIndexByWordIndex.get(wordIndex);
      if (orderIndex === undefined) return;
      if (orderIndex === current.currentOrderIndex) return;

      const range = getRangeWords(current.startOrderIndex, orderIndex);
      onSelectionChange(mergeSelection(current.baseSelection, range));
      const hasMoved = orderIndex !== current.startOrderIndex;

      setDragState({
        ...current,
        currentOrderIndex: orderIndex,
        hasMoved: current.hasMoved || hasMoved,
      });
    },
    [getRangeWords, mergeSelection, onSelectionChange, orderIndexByWordIndex, setDragState]
  );

  useEffect(() => {
    const handlePointerUp = () => {
      const current = dragStateRef.current;
      if (!current) return;
      if (!current.hasMoved) {
        const word = words[current.startWordIndex];
        if (word) {
          toggleWord(word);
        }
      }
      setDragState(null);
    };

    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [toggleWord, words]);

  // Zoom box drawing handlers
  // Video output aspect ratio depends on outputFormat, so zoom box must maintain that aspect ratio
  // in actual pixels, which means adjusting for the source image's aspect ratio
  const calculateZoomBox = useCallback((startX: number, startY: number, endX: number, endY: number): ZoomBox => {
    const imageAspect = imageWidth / imageHeight;
    const { width: outW, height: outH } = OUTPUT_DIMENSIONS[outputFormat];
    const videoAspect = outW / outH;

    // Calculate width from drag
    let width = Math.abs(endX - startX);

    // Height in normalized coords that gives correct aspect in actual pixels
    // normalizedHeight = normalizedWidth * imageAspect / videoAspect
    let height = width * imageAspect / videoAspect;

    // Determine origin based on drag direction
    let x = endX >= startX ? startX : startX - width;
    let y = endY >= startY ? startY : startY - height;

    // Clamp to image bounds
    x = Math.max(0, Math.min(x, 1 - width));
    y = Math.max(0, Math.min(y, 1 - height));

    // Ensure box fits within image
    if (x + width > 1) width = 1 - x;
    if (y + height > 1) {
      height = 1 - y;
      width = height * videoAspect / imageAspect;
    }

    // Minimum size
    width = Math.max(0.05, width);
    height = width * imageAspect / videoAspect;

    return { x, y, width, height };
  }, [imageWidth, imageHeight, outputFormat]);

  const handleZoomPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 || markingMode !== 'zoom') return;
    e.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // If clicking inside the existing zoom box, start moving it
    if (zoomBox && x >= zoomBox.x && x <= zoomBox.x + zoomBox.width
      && y >= zoomBox.y && y <= zoomBox.y + zoomBox.height) {
      zoomMoveStateRef.current = {
        offsetX: x - zoomBox.x,
        offsetY: y - zoomBox.y,
      };
      return;
    }

    // Otherwise, draw a new box
    zoomDragStateRef.current = {
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    };
    setZoomDragPreview(null);
  }, [markingMode, zoomBox]);

  const handleZoomPointerMove = useCallback((e: React.PointerEvent) => {
    if (markingMode !== 'zoom') return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    // Handle moving an existing box
    const moveState = zoomMoveStateRef.current;
    if (moveState && zoomBox) {
      let newX = x - moveState.offsetX;
      let newY = y - moveState.offsetY;
      // Clamp so box stays within bounds
      newX = Math.max(0, Math.min(1 - zoomBox.width, newX));
      newY = Math.max(0, Math.min(1 - zoomBox.height, newY));
      setZoomDragPreview({ ...zoomBox, x: newX, y: newY });
      return;
    }

    // Handle drawing a new box
    const current = zoomDragStateRef.current;
    if (!current) return;

    zoomDragStateRef.current = { ...current, currentX: x, currentY: y };
    setZoomDragPreview(calculateZoomBox(current.startX, current.startY, x, y));
  }, [markingMode, calculateZoomBox, zoomBox]);

  const handleZoomPointerUp = useCallback(() => {
    // Handle completing a move
    if (zoomMoveStateRef.current) {
      if (zoomDragPreview) {
        onZoomBoxChange(zoomDragPreview);
      }
      zoomMoveStateRef.current = null;
      setZoomDragPreview(null);
      return;
    }

    const current = zoomDragStateRef.current;
    if (!current || markingMode !== 'zoom') {
      zoomDragStateRef.current = null;
      setZoomDragPreview(null);
      return;
    }

    const box = calculateZoomBox(current.startX, current.startY, current.currentX, current.currentY);
    // Only save if the box has meaningful size
    if (box.width > 0.05) {
      onZoomBoxChange(box);
    }

    zoomDragStateRef.current = null;
    setZoomDragPreview(null);
  }, [markingMode, calculateZoomBox, onZoomBoxChange, zoomDragPreview]);

  useEffect(() => {
    if (markingMode !== 'zoom') return;

    window.addEventListener('pointerup', handleZoomPointerUp);
    window.addEventListener('pointercancel', handleZoomPointerUp);

    return () => {
      window.removeEventListener('pointerup', handleZoomPointerUp);
      window.removeEventListener('pointercancel', handleZoomPointerUp);
    };
  }, [markingMode, handleZoomPointerUp]);

  // Get the zoom box to display (preview while dragging, or saved)
  const displayZoomBox = zoomDragPreview || zoomBox;

  return (
    <div className="word-selector">
      <div className="word-selector-header">
        <div className="word-selector-title">
          <h2>{markingMode === 'zoom' ? 'Draw Zoom Area' : 'Select Words to Highlight'}</h2>
          <span className="word-selector-meta">{words.length} words · {selectedWords.length} selected</span>
        </div>
        <div className="word-selector-actions">
          <button
            className="btn-ghost word-selector-clear"
            type="button"
            onClick={() => {
              if (markingMode === 'zoom') {
                onZoomBoxChange(null);
              } else {
                onSelectionChange([]);
              }
            }}
            disabled={markingMode === 'zoom' ? !zoomBox : selectedWords.length === 0}
          >
            Clear Selection
          </button>
          <button
            className="btn-ghost"
            type="button"
            onClick={onNewImage}
          >
            New Image
          </button>
        </div>
      </div>
      <div
        className="image-container"
        ref={containerRef}
        style={{ width: '100%', cursor: markingMode === 'zoom' ? 'crosshair' : undefined }}
        onPointerDown={markingMode === 'zoom' ? handleZoomPointerDown : undefined}
        onPointerMove={markingMode === 'zoom' ? handleZoomPointerMove : undefined}
      >
        <img
          src={imageSrc}
          alt="Uploaded"
          style={{ width: '100%', height: 'auto', pointerEvents: markingMode === 'zoom' ? 'none' : undefined }}
        />
        {/* Zoom box overlay */}
        {markingMode === 'zoom' && displayZoomBox && (
          <div
            className="zoom-box-overlay"
            style={{
              position: 'absolute',
              left: `${displayZoomBox.x * 100}%`,
              top: `${displayZoomBox.y * 100}%`,
              width: `${displayZoomBox.width * 100}%`,
              height: `${displayZoomBox.height * 100}%`,
              border: '3px solid rgba(59, 130, 246, 0.9)',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              boxSizing: 'border-box',
              cursor: zoomMoveStateRef.current ? 'grabbing' : 'grab',
            }}
          />
        )}
        {/* Word overlays - only show when not in zoom mode */}
        {markingMode !== 'zoom' && words.map((word, index) => {
          const isSelected = isWordSelected(word);

          // Style based on marking mode
          let bgColor = 'transparent';
          let borderStyle: React.CSSProperties = {
            borderColor: 'transparent',
            borderWidth: 2,
            borderStyle: 'solid',
            borderRadius: '2px',
          };

          if (isSelected) {
            if (markingMode === 'highlight') {
              bgColor = highlightColor;
              borderStyle = {
                borderColor: 'rgba(255, 200, 0, 0.8)',
                borderWidth: 2,
                borderStyle: 'solid',
                borderRadius: '2px',
              };
            } else if (markingMode === 'circle') {
              borderStyle = {
                borderColor: highlightColor,
                borderWidth: 3,
                borderStyle: 'solid',
                borderRadius: '4px',
              };
            } else if (markingMode === 'underline') {
              borderStyle = {
                borderColor: 'transparent',
                borderBottomColor: highlightColor,
                borderWidth: 0,
                borderBottomWidth: 3,
                borderStyle: 'solid',
                borderRadius: '0px',
              };
            } else if (markingMode === 'unblur') {
              bgColor = 'rgba(99, 102, 241, 0.25)';
              borderStyle = {
                borderColor: 'rgb(99, 102, 241)',
                borderWidth: 2,
                borderStyle: 'solid',
                borderRadius: '2px',
              };
            }
          }

          return (
            <div
              key={`${word.text}-${word.left}-${word.top}-${index}`}
              className="word-overlay"
              style={{
                left: word.left * displayScale,
                top: word.top * displayScale,
                width: word.width * displayScale,
                height: word.height * displayScale,
                backgroundColor: bgColor,
                ...borderStyle,
              }}
              onPointerDown={handleWordPointerDown(index)}
              onPointerEnter={() => handleWordPointerEnter(index)}
              title={word.text}
            />
          );
        })}
      </div>

      {markingMode !== 'zoom' && selectedWords.length > 0 && (
        <div className="selected-words">
          <h3>Selected ({selectedWords.length} words):</h3>
          <div className="words-list">
            {sortedSelectedWords.map((word, index) => (
              <span
                key={`${word.text}-${word.left}-${word.top}-${index}`}
                className="word-tag"
              >
                {word.text}
              </span>
            ))}
          </div>
        </div>
      )}
      {markingMode === 'zoom' && zoomBox && (
        <div className="selected-words">
          <h3>Zoom Target Set</h3>
          <div className="words-list">
            <span className="word-tag">
              {Math.round(zoomBox.width * 100)}% × {Math.round(zoomBox.height * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
