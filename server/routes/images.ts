import path from 'path';
import fs from 'fs';

const rootDir = path.resolve(import.meta.dir, '../..');
const uploadsDir = path.join(rootDir, 'public/uploads');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);

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

export async function handleListImages(): Promise<Response> {
  try {
    const entries = fs.readdirSync(uploadsDir, { withFileTypes: true });

    const images = entries
      .filter((entry) => {
        if (!entry.isFile()) return false;
        const ext = path.extname(entry.name).toLowerCase();
        return IMAGE_EXTENSIONS.has(ext);
      })
      .map((entry) => {
        const stat = fs.statSync(path.join(uploadsDir, entry.name));
        return {
          filename: entry.name,
          path: `/uploads/${entry.name}`,
          modifiedAt: stat.mtimeMs,
        };
      })
      .sort((a, b) => b.modifiedAt - a.modifiedAt);

    return jsonResponse(images);
  } catch (error) {
    console.error('List images error:', error);
    return jsonResponse({ error: 'Failed to list images' }, 500);
  }
}
