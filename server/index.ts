import path from 'path';
import { handleUpload } from './routes/upload';
import { handleOCR } from './routes/ocr';
import { handleRender, handleRenderStream } from './routes/render';
import { handleGetSettings, handlePostSettings, handleBrowse, loadSettings, getOutputDir } from './routes/settings';

const rootDir = path.resolve(import.meta.dir, '..');
const PORT = 3001;

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

async function serveStaticFile(filePath: string): Promise<Response> {
  const file = Bun.file(filePath);
  const exists = await file.exists();

  if (!exists) {
    return jsonResponse({ error: 'File not found' }, 404);
  }

  return new Response(file, {
    headers: corsHeaders,
  });
}

const server = Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Static file serving for uploads
    if (pathname.startsWith('/uploads/')) {
      const filename = pathname.slice('/uploads/'.length);
      const filePath = path.join(rootDir, 'public/uploads', filename);
      return serveStaticFile(filePath);
    }

    // Static file serving for output videos (reads configured output dir)
    if (pathname.startsWith('/output/')) {
      const filename = pathname.slice('/output/'.length);
      const settings = await loadSettings();
      const outputDir = getOutputDir(settings);
      const filePath = path.join(outputDir, filename);
      return serveStaticFile(filePath);
    }

    // API routes
    if (pathname === '/api/upload' && request.method === 'POST') {
      return handleUpload(request);
    }

    if (pathname === '/api/ocr' && request.method === 'POST') {
      return handleOCR(request);
    }

    if (pathname === '/api/render' && request.method === 'POST') {
      return handleRender(request);
    }

    if (pathname === '/api/render-stream' && request.method === 'POST') {
      return handleRenderStream(request);
    }

    if (pathname === '/api/settings' && request.method === 'GET') {
      return handleGetSettings();
    }

    if (pathname === '/api/settings' && request.method === 'POST') {
      return handlePostSettings(request);
    }

    if (pathname === '/api/browse' && request.method === 'GET') {
      return handleBrowse(request);
    }

    // 404 for unmatched routes
    return jsonResponse({ error: 'Not found' }, 404);
  },
});

console.log(`Server running on http://localhost:${server.port}`);
