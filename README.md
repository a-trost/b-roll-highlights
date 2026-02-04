# B-Roll Highlights

Convert static images with text into animated highlight videos. Upload an image, let OCR extract the text, select words to highlight, and generate a video with hand-drawn style animations.

## Features

- **Multiple annotation styles**: Highlight, circle, or underline text
- **Hand-drawn aesthetics**: RoughJS-powered sketchy animations
- **Camera effects**: Pan (left/right, up/down) and zoom (in/out)
- **Visual effects**: Blur transitions, VCR overlay, blurred background
- **Smart color detection**: Automatically adapts colors for light/dark images
- **Lower third attribution**: Add source text overlay
- **Keyboard shortcuts**: `Cmd+Enter` to render, `Cmd+S` to download

## Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)

### Installing Tesseract

**macOS:**
```bash
brew install tesseract
```

**Ubuntu/Debian:**
```bash
sudo apt-get install tesseract-ocr
```

**Windows:**
Download installer from [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki)

Verify installation:
```bash
tesseract --version
```

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd remotion-highlights

# Install dependencies
bun install
```

## Development

```bash
# Start both frontend (Vite) and backend (Bun) servers
bun run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### Other Commands

```bash
# Remotion Studio - preview and develop video compositions
bun run remotion:studio

# Build frontend for production
bun run build

# Run only the backend server
bun run server
```

## Project Structure

```
├── src/                    # React frontend
│   ├── components/
│   │   ├── ImageUploader.tsx   # Drag-drop & paste image upload
│   │   ├── WordSelector.tsx    # Click-to-select words on image
│   │   └── VideoPreview.tsx    # Video player with download
│   ├── types/index.ts          # Shared TypeScript interfaces
│   └── App.tsx                 # Main app with settings UI
│
├── server/                 # Bun backend
│   ├── index.ts                # HTTP server & routing
│   ├── routes/
│   │   ├── upload.ts           # Image upload handler
│   │   ├── ocr.ts              # OCR processing endpoint
│   │   └── render.ts           # Video render endpoint
│   └── services/
│       ├── tesseract.ts        # Tesseract CLI wrapper
│       ├── colorExtractor.ts   # Background color detection
│       └── remotionRenderer.ts # Remotion bundle & render
│
├── remotion/               # Video composition
│   ├── Root.tsx                # Composition registration
│   ├── Composition.tsx         # Main video component
│   └── components/
│       ├── RoughHighlighter.tsx # Hand-drawn highlights
│       ├── SvgCircler.tsx       # Circle annotations
│       ├── SvgUnderliner.tsx    # Underline annotations
│       ├── VCREffect.tsx        # VHS tape overlay
│       └── LowerThird.tsx       # Attribution text
│
├── public/uploads/         # Uploaded images (gitignored)
└── output/                 # Rendered videos (gitignored)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│                      http://localhost:5173                  │
└─────────────────────────┬───────────────────────────────────┘
                          │ /api/upload, /api/ocr, /api/render
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Bun Server)                     │
│                      http://localhost:3001                  │
├─────────────────────────────────────────────────────────────┤
│  Upload → UUID filename → public/uploads/                   │
│  OCR    → Tesseract CLI → word bounding boxes              │
│  Render → Remotion      → output/*.mp4                     │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

1. **Upload**: Image is saved with a UUID filename to `public/uploads/`
2. **OCR**: Tesseract extracts text with bounding box coordinates; Sharp detects dominant background color
3. **Selection**: User clicks words on the image to select them for highlighting
4. **Configuration**: User adjusts timing, colors, and effects
5. **Render**: Remotion bundles the composition and renders to MP4 (1920x1080, 30fps, H.264)

## Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| **Mode** | Highlight, Circle, or Underline | Highlight |
| **Color** | Annotation color (adapts to image brightness) | Yellow |
| **Lead In** | Seconds before highlighting starts | 1s |
| **Speed** | Characters highlighted per second | 15 chr/s |
| **Lead Out** | Seconds after highlighting ends | 2s |
| **Camera** | Pan direction or zoom | Left → Right |
| **Blur** | Blur in, out, both, or none | Blur In |
| **Background** | Blur the image background | Off |
| **VCR Effect** | VHS tape visual overlay | Off |
| **Attribution** | Lower third text overlay | Empty |

## API Endpoints

### `POST /api/upload`
Upload an image file.

**Request**: `multipart/form-data` with `image` field

**Response**:
```json
{
  "filename": "uuid.png",
  "path": "/uploads/uuid.png"
}
```

### `POST /api/ocr`
Run OCR on an uploaded image.

**Request**:
```json
{ "filename": "uuid.png" }
```

**Response**:
```json
{
  "words": [
    { "text": "Hello", "left": 100, "top": 50, "width": 80, "height": 20, "confidence": 95 }
  ],
  "backgroundColor": [255, 255, 255],
  "imageWidth": 1920,
  "imageHeight": 1080
}
```

### `POST /api/render`
Render a highlight video.

**Request**:
```json
{
  "filename": "uuid.png",
  "selectedWords": [...],
  "backgroundColor": [255, 255, 255],
  "imageWidth": 1920,
  "imageHeight": 1080,
  "highlightColor": "rgba(255, 230, 0, 0.3)",
  "markingMode": "highlight",
  "leadInSeconds": 1,
  "charsPerSecond": 15,
  "leadOutSeconds": 2,
  "blurredBackground": false,
  "cameraMovement": "left-right",
  "blurMode": "blur-in",
  "vcrEffect": false,
  "attributionText": ""
}
```

**Response**:
```json
{ "videoPath": "/output/uuid.mp4" }
```

## Troubleshooting

### "tesseract: command not found"
Tesseract OCR is not installed or not in PATH. See [Prerequisites](#prerequisites).

### OCR returns no words
- Ensure the image has clear, readable text
- Try higher resolution images
- Check that Tesseract language packs are installed

### Video render fails
- Check console for Remotion errors
- Ensure sufficient disk space in `output/`
- Try reducing video duration (fewer words or faster speed)

## License

MIT
