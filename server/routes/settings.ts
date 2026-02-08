import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const rootDir = path.resolve(import.meta.dir, '../..');
const settingsPath = path.join(import.meta.dir, '..', 'settings.json');
const defaultOutputDir = path.join(rootDir, 'output');

export type AppSettings = {
  outputDir: string;
};

const defaults: AppSettings = { outputDir: '' };

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(settingsPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

export function getOutputDir(settings: AppSettings): string {
  return settings.outputDir || defaultOutputDir;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function handleGetSettings(): Promise<Response> {
  const settings = await loadSettings();
  return jsonResponse(settings);
}

export async function handleBrowse(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const requestedPath = url.searchParams.get('path') || os.homedir();
    const resolved = path.resolve(requestedPath);

    let entries: { name: string; path: string }[] = [];
    try {
      const items = await fs.readdir(resolved, { withFileTypes: true });
      entries = items
        .filter((item) => item.isDirectory() && !item.name.startsWith('.'))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => ({
          name: item.name,
          path: path.join(resolved, item.name),
        }));
    } catch {
      // If we can't read the directory, return empty list
    }

    const parent = path.dirname(resolved);
    return jsonResponse({
      current: resolved,
      parent: parent !== resolved ? parent : null,
      entries,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Browse failed' },
      500
    );
  }
}

export async function handlePostSettings(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { outputDir } = body as Partial<AppSettings>;

    if (outputDir !== undefined && typeof outputDir !== 'string') {
      return jsonResponse({ error: 'outputDir must be a string' }, 400);
    }

    const resolvedDir = outputDir?.trim() || '';

    // If a custom dir is specified, ensure it exists
    if (resolvedDir) {
      try {
        await fs.mkdir(resolvedDir, { recursive: true });
      } catch (err) {
        return jsonResponse(
          { error: `Cannot create directory: ${err instanceof Error ? err.message : String(err)}` },
          400
        );
      }
    }

    const settings: AppSettings = { outputDir: resolvedDir };
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));

    return jsonResponse(settings);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Failed to save settings' },
      500
    );
  }
}
