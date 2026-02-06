import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { fileURLToPath } from 'url';
import type { HighlightProps } from '../../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

let bundleLocation: string | null = null;
let isBundling = false;

export type RenderProgress = {
  stage: 'bundling' | 'composing' | 'rendering' | 'done' | 'error';
  progress: number; // 0-100
  message: string;
};

function generateFilename(props: HighlightProps): string {
  const words = props.selectedWords.map((w) => w.text).join("-");
  // Sanitize: remove special chars, limit length
  const sanitized = words
    .replace(/[^a-zA-Z0-9-]/g, "")
    .slice(0, 50);
  // Add short timestamp for uniqueness
  const timestamp = Date.now().toString(36);
  return `Highlight-${sanitized || "video"}-${timestamp}.mp4`;
}

async function ensureBundle(onProgress?: (p: RenderProgress) => void): Promise<string> {
  if (bundleLocation) {
    return bundleLocation;
  }

  // Prevent concurrent bundling
  if (isBundling) {
    // Wait for bundling to complete
    while (isBundling) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (bundleLocation) return bundleLocation;
  }

  isBundling = true;
  onProgress?.({ stage: 'bundling', progress: 5, message: 'Bundling Remotion project...' });

  console.log('Bundling Remotion project...');
  bundleLocation = await bundle({
    entryPoint: path.join(rootDir, 'remotion/index.ts'),
    webpackOverride: (config) => config,
  });
  console.log('Bundle created at:', bundleLocation);

  isBundling = false;
  return bundleLocation;
}

export async function renderHighlightVideo(
  props: HighlightProps,
  onProgress?: (p: RenderProgress) => void
): Promise<string> {
  const bundlePath = await ensureBundle(onProgress);

  onProgress?.({ stage: 'composing', progress: 15, message: 'Preparing composition...' });

  const outputFileName = generateFilename(props);
  const outputPath = path.join(rootDir, 'output', outputFileName);

  // Cast props to satisfy Remotion's type expectations
  const inputProps = props as unknown as Record<string, unknown>;

  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: 'HighlightVideo',
    inputProps,
  });

  onProgress?.({ stage: 'rendering', progress: 20, message: 'Rendering frames...' });

  console.log('Rendering video...');
  await renderMedia({
    composition,
    serveUrl: bundlePath,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }) => {
      // progress is 0-1, map to 20-95 range
      const pct = Math.round(20 + progress * 75);
      onProgress?.({
        stage: 'rendering',
        progress: pct,
        message: `Rendering: ${Math.round(progress * 100)}%`
      });
    },
  });

  onProgress?.({ stage: 'done', progress: 100, message: 'Complete!' });

  console.log('Video rendered to:', outputPath);
  return `/output/${outputFileName}`;
}
