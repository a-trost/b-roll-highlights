import { useMemo, useState, useEffect, useRef } from 'react';
import type { WordBox } from '../types';

interface WordSelectorProps {
  imageSrc: string;
  words: WordBox[];
  selectedWords: WordBox[];
  onSelectionChange: (words: WordBox[]) => void;
  imageWidth: number;
  imageHeight: number;
}

export const WordSelector: React.FC<WordSelectorProps> = ({
  imageSrc,
  words,
  selectedWords,
  onSelectionChange,
  imageWidth,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayScale, setDisplayScale] = useState(1);

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

  const toggleWord = (word: WordBox) => {
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
  };

  const isWordSelected = (word: WordBox) => {
    return selectedWords.some(
      (w) =>
        w.left === word.left &&
        w.top === word.top &&
        w.text === word.text
    );
  };

  const sortedSelectedWords = useMemo(() => {
    if (selectedWords.length === 0) return [];

    // Group words into rows based on vertical overlap
    const wordsCopy = [...selectedWords];
    const rows: WordBox[][] = [];

    // Sort by top position first to process top-to-bottom
    wordsCopy.sort((a, b) => a.top - b.top);

    for (const word of wordsCopy) {
      // Find a row where this word belongs (vertical overlap or close proximity)
      let foundRow = false;
      for (const row of rows) {
        // Check if word overlaps vertically with any word in the row
        const rowTop = Math.min(...row.map(w => w.top));
        const rowBottom = Math.max(...row.map(w => w.top + w.height));
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

    // Sort each row by left position, then flatten
    return rows
      .sort((a, b) => Math.min(...a.map(w => w.top)) - Math.min(...b.map(w => w.top)))
      .flatMap(row => row.sort((a, b) => a.left - b.left));
  }, [selectedWords]);

  return (
    <div className="word-selector">
      <h2>Select Words to Highlight</h2>
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
        {words.map((word, index) => (
          <div
            key={`${word.text}-${word.left}-${word.top}-${index}`}
            className={`word-overlay ${isWordSelected(word) ? 'selected' : ''}`}
            style={{
              left: word.left * displayScale,
              top: word.top * displayScale,
              width: word.width * displayScale,
              height: word.height * displayScale,
            }}
            onClick={() => toggleWord(word)}
            title={word.text}
          />
        ))}
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
