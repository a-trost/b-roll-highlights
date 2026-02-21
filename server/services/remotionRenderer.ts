import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import type { HighlightProps } from '../../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

let bundleLocation: string | null = null;
let isBundling = false;

export type RenderProgress = {
  stage: 'bundling' | 'composing' | 'rendering' | 'preview-ready' | 'done' | 'error';
  progress: number; // 0-100
  message: string;
};

export type RenderResult = {
  videoPath: string;
  downloadPath?: string; // ProRes .mov for lower-third mode
};

function generateFilename(props: HighlightProps, suffix?: string): string {
  const isLowerThird = props.markingMode === "lower-third";
  const timestamp = Date.now().toString(36);

  if (isLowerThird) {
    const name = (props.lowerThirdName || "lower-third")
      .replace(/[^a-zA-Z0-9-]/g, "")
      .slice(0, 50);
    const ext = suffix ? `.${suffix}` : '.mov';
    const tag = suffix ? `-${suffix}` : '';
    return `LowerThird-${name}-${timestamp}${tag}${ext}`;
  }

  const words = props.selectedWords.map((w) => w.text).join("-");
  const sanitized = words
    .replace(/[^a-zA-Z0-9-]/g, "")
    .slice(0, 50);
  return `Highlight-${sanitized || "video"}-${timestamp}.mp4`;
}

async function ensureBundle(onProgress?: (p: RenderProgress) => void): Promise<string> {
  if (bundleLocation) {
    return bundleLocation;
  }

  // Prevent concurrent bundling
  if (isBundling) {
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
  onProgress?: (p: RenderProgress) => void,
  outputDir?: string
): Promise<RenderResult> {
  const bundlePath = await ensureBundle(onProgress);

  onProgress?.({ stage: 'composing', progress: 15, message: 'Preparing composition...' });

  const resolvedOutputDir = outputDir || path.join(rootDir, 'output');
  await fs.mkdir(resolvedOutputDir, { recursive: true });

  const isLowerThird = props.markingMode === "lower-third";

  if (isLowerThird) {
    return renderLowerThird(bundlePath, props, resolvedOutputDir, onProgress);
  }

  // Standard render (H.264)
  const outputFileName = generateFilename(props);
  const outputPath = path.join(resolvedOutputDir, outputFileName);
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
      const pct = Math.round(20 + progress * 75);
      onProgress?.({ stage: 'rendering', progress: pct, message: `Rendering: ${Math.round(progress * 100)}%` });
    },
  });

  onProgress?.({ stage: 'done', progress: 100, message: 'Complete!' });
  console.log('Video rendered to:', outputPath);
  return { videoPath: `/output/${outputFileName}` };
}

async function renderLowerThird(
  bundlePath: string,
  props: HighlightProps,
  outputDir: string,
  onProgress?: (p: RenderProgress) => void,
): Promise<RenderResult> {
  const inputProps = props as unknown as Record<string, unknown>;

  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: 'HighlightVideo',
    inputProps,
  });

  // 1) Render H.264 preview (with white background) — 0-55%
  onProgress?.({ stage: 'rendering', progress: 20, message: 'Rendering preview...' });

  const previewFileName = generateFilename(props, 'preview.mp4');
  const previewPath = path.join(outputDir, previewFileName);
  const previewProps = { ...inputProps, lowerThirdPreviewBg: true };

  // Refetch composition with preview props so calculateMetadata sees them
  const previewComposition = await selectComposition({
    serveUrl: bundlePath,
    id: 'HighlightVideo',
    inputProps: previewProps,
  });

  await renderMedia({
    composition: previewComposition,
    serveUrl: bundlePath,
    codec: 'h264',
    outputLocation: previewPath,
    inputProps: previewProps,
    onProgress: ({ progress }) => {
      const pct = Math.round(20 + progress * 35);
      onProgress?.({ stage: 'rendering', progress: pct, message: `Preview: ${Math.round(progress * 100)}%` });
    },
  });

  // Send preview-ready so the frontend can show the video immediately
  const previewVideoPath = `/output/${previewFileName}`;
  // The videoPath is picked up by the stream handler via the extended event type
  (onProgress as ((p: RenderProgress & { videoPath?: string }) => void) | undefined)?.({
    stage: 'preview-ready',
    progress: 55,
    message: 'Preview ready',
    videoPath: previewVideoPath,
  });

  // 2) Render ProRes 4444 .mov (transparent) — 55-95%
  onProgress?.({ stage: 'rendering', progress: 56, message: 'Rendering ProRes .mov...' });

  const movFileName = generateFilename(props);
  const movPath = path.join(outputDir, movFileName);

  await renderMedia({
    composition,
    serveUrl: bundlePath,
    codec: 'prores',
    proResProfile: '4444',
    outputLocation: movPath,
    inputProps,
    onProgress: ({ progress }) => {
      const pct = Math.round(56 + progress * 39);
      onProgress?.({ stage: 'rendering', progress: pct, message: `ProRes: ${Math.round(progress * 100)}%` });
    },
  });

  onProgress?.({ stage: 'done', progress: 100, message: 'Complete!' });
  console.log('Lower third rendered:', previewPath, movPath);

  return {
    videoPath: previewVideoPath,
    downloadPath: `/output/${movFileName}`,
  };
}
