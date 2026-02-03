import sharp from 'sharp';

export async function extractDominantColor(
  imagePath: string
): Promise<[number, number, number]> {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const width = metadata.width || 100;
    const height = metadata.height || 100;

    // Sample pixels from edges and corners where background is most likely
    const sampleSize = 20;
    const samples: Array<{ r: number; g: number; b: number }> = [];

    // Get raw pixel data
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels;

    // Helper to get pixel color at x, y
    const getPixel = (x: number, y: number) => {
      const idx = (y * width + x) * channels;
      return {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
      };
    };

    // Sample from top edge
    for (let x = 0; x < width; x += Math.floor(width / sampleSize)) {
      samples.push(getPixel(x, 0));
      samples.push(getPixel(x, Math.min(5, height - 1)));
    }

    // Sample from bottom edge
    for (let x = 0; x < width; x += Math.floor(width / sampleSize)) {
      samples.push(getPixel(x, height - 1));
      samples.push(getPixel(x, Math.max(0, height - 6)));
    }

    // Sample from left edge
    for (let y = 0; y < height; y += Math.floor(height / sampleSize)) {
      samples.push(getPixel(0, y));
      samples.push(getPixel(Math.min(5, width - 1), y));
    }

    // Sample from right edge
    for (let y = 0; y < height; y += Math.floor(height / sampleSize)) {
      samples.push(getPixel(width - 1, y));
      samples.push(getPixel(Math.max(0, width - 6), y));
    }

    // Sample from corners (extra weight)
    const cornerOffsets = [0, 1, 2, 3, 4];
    for (const offset of cornerOffsets) {
      // Top-left
      samples.push(getPixel(offset, offset));
      // Top-right
      samples.push(getPixel(width - 1 - offset, offset));
      // Bottom-left
      samples.push(getPixel(offset, height - 1 - offset));
      // Bottom-right
      samples.push(getPixel(width - 1 - offset, height - 1 - offset));
    }

    // Find most common color by bucketing similar colors
    const colorCounts = new Map<string, { count: number; r: number; g: number; b: number }>();

    for (const sample of samples) {
      // Bucket colors by rounding to nearest 8 to group similar shades
      const bucketR = Math.round(sample.r / 8) * 8;
      const bucketG = Math.round(sample.g / 8) * 8;
      const bucketB = Math.round(sample.b / 8) * 8;
      const key = `${bucketR},${bucketG},${bucketB}`;

      const existing = colorCounts.get(key);
      if (existing) {
        existing.count++;
        // Average the actual colors in this bucket
        existing.r = Math.round((existing.r * (existing.count - 1) + sample.r) / existing.count);
        existing.g = Math.round((existing.g * (existing.count - 1) + sample.g) / existing.count);
        existing.b = Math.round((existing.b * (existing.count - 1) + sample.b) / existing.count);
      } else {
        colorCounts.set(key, { count: 1, r: sample.r, g: sample.g, b: sample.b });
      }
    }

    // Find the most common color bucket
    let maxCount = 0;
    let mostCommon = { r: 255, g: 255, b: 255 };

    for (const [, value] of colorCounts) {
      if (value.count > maxCount) {
        maxCount = value.count;
        mostCommon = { r: value.r, g: value.g, b: value.b };
      }
    }

    return [mostCommon.r, mostCommon.g, mostCommon.b];
  } catch (error) {
    console.error('Error extracting color:', error);
    return [255, 255, 255];
  }
}
