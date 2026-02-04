import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { WordBox, MarkingMode } from '../types';

interface WordSelectorProps {
  imageSrc: string;
  words: WordBox[];
  selectedWords: WordBox[];
  onSelectionChange: (words: WordBox[]) => void;
  imageWidth: number;
  imageHeight: number;
  markingMode: MarkingMode;
  highlightColor: string;
}

export const WordSelector: React.FC<WordSelectorProps> = ({
  imageSrc,
  words,
  selectedWords,
  onSelectionChange,
  imageWidth,
  markingMode,
  highlightColor,
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

  const containerRef = useRef<HTMLDivElement>(null);
  const [displayScale, setDisplayScale] = useState(1);
  const dragStateRef = useRef<DragState | null>(null);

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

  return (
    <div className="word-selector">
      <div className="word-selector-header">
        <h2>Select Words to Highlight</h2>
        <button
          className="btn-ghost word-selector-clear"
          type="button"
          onClick={() => onSelectionChange([])}
          disabled={selectedWords.length === 0}
        >
          Clear Selection
        </button>
      </div>
      <div
        className="image-container"
        ref={containerRef}
        style={{ width: '100%' }}
      >
        <img
          src={imageSrc}
          alt="Uploaded"
          style={{ width: '100%', height: 'auto' }}
        />
        {words.map((word, index) => {
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
              bgColor = 'rgba(255, 255, 255, 0.12)';
              borderStyle = {
                borderColor: highlightColor,
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

      {selectedWords.length > 0 && (
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
    </div>
  );
};
