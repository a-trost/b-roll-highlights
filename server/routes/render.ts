import { renderHighlightVideo, type RenderProgress } from '../services/remotionRenderer';
import { loadSettings, getOutputDir } from './settings';
import type { HighlightProps, WordBox, MarkingMode, CameraMovement, EnterAnimation, ExitAnimation, ZoomBox, OutputFormat } from '../../src/types';
import {
  DEFAULT_LEAD_IN_SECONDS,
  DEFAULT_LEAD_OUT_SECONDS,
  DEFAULT_CHARS_PER_SECOND,
  DEFAULT_UNBLUR_SECONDS,
  DEFAULT_ZOOM_DURATION_SECONDS,
} from '../../src/types';

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

function parseRenderBody(body: Record<string, unknown>): HighlightProps | { error: string } {
  const {
    filename,
    selectedWords,
    zoomBox,
    backgroundColor,
    imageWidth,
    imageHeight,
    highlightColor,
    markingMode,
    leadInSeconds,
    charsPerSecond,
    leadOutSeconds,
    zoomDurationSeconds,
    blurredBackground,
    cameraMovement,
    enterAnimation,
    exitAnimation,
    vcrEffect,
    unblurSeconds,
    attributionText,
    attributionBgColor,
    attributionTextColor,
    outputFormat,
    frameRate,
  } = body;

  if (!filename || !backgroundColor) {
    return { error: 'Missing required fields' };
  }

  // Either selectedWords or zoomBox required
  if ((!selectedWords || (selectedWords as WordBox[]).length === 0) && !zoomBox) {
    return { error: 'Either selectedWords or zoomBox required' };
  }

  return {
    imageSrc: `http://localhost:3001/uploads/${filename}`,
    selectedWords: (selectedWords as WordBox[]) || [],
    backgroundColor: backgroundColor as [number, number, number],
    imageWidth: (imageWidth as number) || 1920,
    imageHeight: (imageHeight as number) || 1080,
    highlightColor: (highlightColor as string) || 'rgba(255, 230, 0, 0.5)',
    markingMode: (markingMode as MarkingMode) || 'highlight',
    leadInSeconds: (leadInSeconds as number) ?? DEFAULT_LEAD_IN_SECONDS,
    charsPerSecond: (charsPerSecond as number) ?? DEFAULT_CHARS_PER_SECOND,
    leadOutSeconds: (leadOutSeconds as number) ?? DEFAULT_LEAD_OUT_SECONDS,
    blurredBackground: (blurredBackground as boolean) ?? false,
    unblurSeconds: (unblurSeconds as number) ?? DEFAULT_UNBLUR_SECONDS,
    zoomBox: zoomBox as ZoomBox | undefined,
    zoomDurationSeconds: (zoomDurationSeconds as number) ?? DEFAULT_ZOOM_DURATION_SECONDS,
    cameraMovement: (cameraMovement as CameraMovement) || 'left-right',
    enterAnimation: (enterAnimation as EnterAnimation) || 'blur',
    exitAnimation: (exitAnimation as ExitAnimation) || 'none',
    vcrEffect: (vcrEffect as boolean) ?? false,
    attributionText: (attributionText as string) || '',
    attributionBgColor: (attributionBgColor as string) || '#E8C6FE',
    attributionTextColor: (attributionTextColor as string) || '#333333',
    outputFormat: (outputFormat as OutputFormat) || 'landscape',
    frameRate: (frameRate as 24 | 30 | 60) || 30,
  };
}

export async function handleRender(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const result = parseRenderBody(body);

    if ('error' in result) {
      return jsonResponse({ error: result.error }, 400);
    }

    const settings = await loadSettings();
    const outputDir = getOutputDir(settings);
    const videoPath = await renderHighlightVideo(result, undefined, outputDir);
    return jsonResponse({ videoPath });
  } catch (error) {
    console.error('Render error:', error);
    return jsonResponse({ error: 'Failed to render video' }, 500);
  }
}

export async function handleRenderStream(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const result = parseRenderBody(body);

    if ('error' in result) {
      return jsonResponse({ error: result.error }, 400);
    }

    const settings = await loadSettings();
    const outputDir = getOutputDir(settings);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: RenderProgress & { videoPath?: string }) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const videoPath = await renderHighlightVideo(result, (progress) => {
            sendEvent(progress);
          }, outputDir);

          sendEvent({ stage: 'done', progress: 100, message: 'Complete!', videoPath });
          controller.close();
        } catch (error) {
          console.error('Render error:', error);
          sendEvent({
            stage: 'error',
            progress: 0,
            message: error instanceof Error ? error.message : 'Render failed'
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Render stream error:', error);
    return jsonResponse({ error: 'Failed to start render' }, 500);
  }
}
