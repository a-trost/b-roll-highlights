import { renderHighlightVideo } from '../services/remotionRenderer';
import type { HighlightProps, WordBox, MarkingMode, CameraMovement, EnterAnimation, ExitAnimation } from '../../src/types';
import {
  DEFAULT_LEAD_IN_SECONDS,
  DEFAULT_LEAD_OUT_SECONDS,
  DEFAULT_CHARS_PER_SECOND,
  DEFAULT_UNBLUR_SECONDS,
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

export async function handleRender(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const {
      filename,
      selectedWords,
      backgroundColor,
      imageWidth,
      imageHeight,
      highlightColor,
      markingMode,
      leadInSeconds,
      charsPerSecond,
      leadOutSeconds,
      blurredBackground,
      cameraMovement,
      enterAnimation,
      exitAnimation,
      vcrEffect,
      unblurSeconds,
      previewSeconds,
      attributionText,
    } = body;

    if (!filename || !selectedWords || !backgroundColor) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    const props: HighlightProps = {
      imageSrc: `http://localhost:3001/uploads/${filename}`,
      selectedWords: selectedWords as WordBox[],
      backgroundColor: backgroundColor as [number, number, number],
      imageWidth: imageWidth || 1920,
      imageHeight: imageHeight || 1080,
      highlightColor: highlightColor || 'rgba(255, 230, 0, 0.5)',
      markingMode: (markingMode as MarkingMode) || 'highlight',
      leadInSeconds: leadInSeconds ?? DEFAULT_LEAD_IN_SECONDS,
      charsPerSecond: charsPerSecond ?? DEFAULT_CHARS_PER_SECOND,
      leadOutSeconds: leadOutSeconds ?? DEFAULT_LEAD_OUT_SECONDS,
      blurredBackground: blurredBackground ?? false,
      unblurSeconds: unblurSeconds ?? DEFAULT_UNBLUR_SECONDS,
      previewSeconds: previewSeconds ?? 0,
      cameraMovement: (cameraMovement as CameraMovement) || 'left-right',
      enterAnimation: (enterAnimation as EnterAnimation) || 'blur',
      exitAnimation: (exitAnimation as ExitAnimation) || 'none',
      vcrEffect: vcrEffect ?? false,
      attributionText: attributionText || '',
    };

    const videoPath = await renderHighlightVideo(props);

    return jsonResponse({ videoPath });
  } catch (error) {
    console.error('Render error:', error);
    return jsonResponse({ error: 'Failed to render video' }, 500);
  }
}
