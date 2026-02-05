import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { fileURLToPath } from 'url';
import type { HighlightProps } from '../../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

let bundleLocation: string | null = null;

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

async function ensureBundle(): Promise<string> {
  if (bundleLocation) {
    return bundleLocation;
  }

  console.log('Bundling Remotion project...');
  bundleLocation = await bundle({
    entryPoint: path.join(rootDir, 'remotion/index.ts'),
    webpackOverride: (config) => config,
  });
  console.log('Bundle created at:', bundleLocation);

  return bundleLocation;
}

export async function renderHighlightVideo(
  props: HighlightProps
): Promise<string> {
  const bundlePath = await ensureBundle();

  const outputFileName = generateFilename(props);
  const outputPath = path.join(rootDir, 'output', outputFileName);

  // Cast props to satisfy Remotion's type expectations
  const inputProps = props as unknown as Record<string, unknown>;

  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: 'HighlightVideo',
    inputProps,
  });

  console.log('Rendering video...');
  await renderMedia({
    composition,
    serveUrl: bundlePath,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
  });

  console.log('Video rendered to:', outputPath);
  return `/output/${outputFileName}`;
}
