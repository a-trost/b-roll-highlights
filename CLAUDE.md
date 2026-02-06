# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

B-Magic converts static images with text into animated highlight videos. Users upload an image, OCR extracts text, users select words to highlight, and the system generates a video with animated highlight effects.

## Commands

```bash
# Development - starts Vite (5173) and Express server (3001) concurrently
npm run dev

# Remotion Studio - for developing/previewing video compositions
npm run remotion:studio

# Build frontend
npm run build

# Start only the backend server
npm run server
```

**System Requirement:** Tesseract OCR must be installed (`tesseract` command available in PATH).

## Architecture

```
Frontend (Vite + React, port 5173)
    │
    │  /api/upload, /api/ocr, /api/render (proxied)
    ▼
Backend (Express, port 3001)
    │
    │  Bundling & Rendering
    ▼
Remotion (Video Composition)
```

### Key Directories

- `src/` - React frontend (upload UI, word selection, settings panel)
- `server/` - Express backend (file upload, OCR, video rendering)
- `remotion/` - Video composition and animation effects
- `public/uploads/` - Uploaded images
- `output/` - Rendered MP4 videos

### Data Flow

1. Image upload → stored with UUID in `public/uploads/`
2. OCR processing (Tesseract) + background color extraction (Sharp)
3. User selects words and configures effects
4. Remotion renders video → saved to `output/`

### Frontend State (App.tsx)

Main state includes: image data, selected words, marking mode (highlight/circle/underline), timing settings (leadIn, charsPerSecond, leadOut), and effects (blur, camera movement, VCR effect).

### Remotion Components

- `Root.tsx` - Composition registration, duration calculation
- `Composition.tsx` - Main video component with camera and blur effects
- `components/RoughHighlighter.tsx` - Hand-drawn style highlights using RoughJS
- `components/SvgCircler.tsx` - Circle annotations
- `components/SvgUnderliner.tsx` - Underline annotations
- `components/VCREffect.tsx` - VHS tape visual effects

### Backend Services

- `services/tesseract.ts` - OCR via Tesseract CLI
- `services/colorExtractor.ts` - Dominant background color detection
- `services/remotionRenderer.ts` - Bundle caching and video rendering

## Types

All TypeScript interfaces are centralized in `src/types/index.ts`, including Word, CompositionProps, marking mode enums, camera movement options, and blur modes.

## Video Output

MP4 H.264 codec, 1920x1080 resolution, 30 FPS. Duration calculated from character count × chars-per-second ratio.
