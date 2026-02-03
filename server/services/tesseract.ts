import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import type { WordBox } from '../../src/types';

const execAsync = promisify(exec);

export async function runOCR(imagePath: string): Promise<WordBox[]> {
  const outputBase = imagePath.replace(/\.[^.]+$/, '_ocr');
  const outputTsv = `${outputBase}.tsv`;

  try {
    // Run tesseract with TSV output
    await execAsync(
      `tesseract "${imagePath}" "${outputBase}" -l eng --psm 3 tsv`
    );

    // Read and parse TSV output
    const tsvContent = await fs.readFile(outputTsv, 'utf-8');
    const lines = tsvContent.trim().split('\n');

    // Skip header line
    const words: WordBox[] = [];

    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split('\t');

      // TSV columns: level, page_num, block_num, par_num, line_num, word_num, left, top, width, height, conf, text
      if (columns.length >= 12) {
        const confidence = parseInt(columns[10], 10);
        const text = columns[11].trim();

        // Only include actual words with reasonable confidence
        if (text && confidence > 30) {
          words.push({
            text,
            left: parseInt(columns[6], 10),
            top: parseInt(columns[7], 10),
            width: parseInt(columns[8], 10),
            height: parseInt(columns[9], 10),
            confidence,
          });
        }
      }
    }

    // Clean up TSV file
    await fs.unlink(outputTsv).catch(() => {});

    return words;
  } catch (error) {
    // Clean up TSV file on error
    await fs.unlink(outputTsv).catch(() => {});
    throw error;
  }
}
