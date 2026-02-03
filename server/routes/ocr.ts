import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { runOCR } from '../services/tesseract';
import { extractDominantColor } from '../services/colorExtractor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      res.status(400).json({ error: 'Filename is required' });
      return;
    }

    const imagePath = path.join(rootDir, 'public/uploads', filename);

    // Get image dimensions
    const metadata = await sharp(imagePath).metadata();
    const imageWidth = metadata.width || 1920;
    const imageHeight = metadata.height || 1080;

    // Run OCR and color extraction in parallel
    const [words, backgroundColor] = await Promise.all([
      runOCR(imagePath),
      extractDominantColor(imagePath),
    ]);

    res.json({
      words,
      backgroundColor,
      imageWidth,
      imageHeight,
    });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

export default router;
