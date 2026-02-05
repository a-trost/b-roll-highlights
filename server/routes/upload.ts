import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const rootDir = path.resolve(import.meta.dir, '../..');
const uploadsDir = path.join(rootDir, 'public/uploads');

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

export async function handleUpload(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file || !(file instanceof File)) {
      return jsonResponse({ error: 'No file uploaded' }, 400);
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return jsonResponse(
        { error: 'Invalid file type. Only PNG, JPEG, WebP, and AVIF are allowed.' },
        400
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse(
        { error: 'File too large. Maximum size is 10MB.' },
        400
      );
    }

    // Generate unique filename
    const ext = path.extname(file.name);
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    // Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    await Bun.write(filePath, arrayBuffer);

    return jsonResponse({
      filename,
      path: `/uploads/${filename}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return jsonResponse({ error: 'Failed to upload file' }, 500);
  }
}
