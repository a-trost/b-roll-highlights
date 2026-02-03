import path from 'path';
import sharp from 'sharp';
import { runOCR } from '../services/tesseract';
import { extractDominantColor } from '../services/colorExtractor';

const rootDir = path.resolve(import.meta.dir, '../..');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export async function handleOCR(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { filename } = body;

    if (!filename) {
      return jsonResponse({ error: 'Filename is required' }, 400);
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

    return jsonResponse({
      words,
      backgroundColor,
      imageWidth,
      imageHeight,
    });
  } catch (error) {
    console.error('OCR error:', error);
    return jsonResponse({ error: 'Failed to process image' }, 500);
  }
}
