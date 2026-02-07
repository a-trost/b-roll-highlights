# B-Magic

Convert static images with text into animated highlight videos. Upload an image, let OCR extract the text, select words to highlight, and generate a video with hand-drawn style animations.

## Features

- **5 annotation modes**: Highlight, circle, underline, unblur, and zoom
- **Hand-drawn aesthetics**: RoughJS-powered sketchy highlights, circles, and underlines
- **Zoom mode**: Draw a region and the camera pans/zooms into it
- **Camera effects**: Pan (left/right, up/down) and zoom (in/out)
- **Enter/exit animations**: Blur, slide from any direction, or none
- **VCR overlay**: Retro VHS effect with scanlines, chromatic aberration, static noise, and vignette
- **3 output formats**: Landscape (1920x1080), portrait (1080x1920), and square (1080x1080)
- **Framerate options**: 24, 30, or 60 fps
- **Preset system**: Save, load, rename, and delete effect presets. Ships with 6 built-in presets
- **Smart color detection**: Automatically adapts annotation colors and blend modes for light/dark images
- **Lower third attribution**: Animated source text overlay
- **Multiple input methods**: Drag & drop, clipboard paste (Cmd+V), or file picker.
- **Persistent state**: Settings and selections survive page reloads
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
│   │   ├── VideoPreview.tsx    # Video player with download
│   │   ├── PresetsPanel.tsx    # Preset management UI
│   │   └── FormatSelector.tsx  # Output format & framerate picker
│   ├── hooks/
│   │   └── useFavicon.ts       # Dynamic favicon based on render state
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
│       ├── RoughHighlighter.tsx # Hand-drawn highlights (RoughJS)
│       ├── SvgCircler.tsx       # Circle annotations
│       ├── SvgUnderliner.tsx    # Underline annotations
│       ├── UnblurReveal.tsx     # Blur-to-sharp text reveal
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
                          │ /api/upload, /api/ocr, /api/render-stream
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
5. **Render**: Remotion bundles the composition (cached after first render) and renders to MP4 (H.264). Progress streams to the UI in real time via SSE

## Configuration Options

| Setting           | Description                                        | Default        |
| ----------------- | -------------------------------------------------- | -------------- |
| **Mode**          | Highlight, Circle, Underline, Unblur, or Zoom      | Highlight      |
| **Color**         | Annotation color (adapts to image brightness)      | Yellow         |
| **Lead In**       | Seconds before annotations start (0–8s)            | 1s             |
| **Speed**         | Characters per second for annotation reveal (5–30) | 15 chr/s       |
| **Lead Out**      | Seconds after annotations finish (0–8s)            | 2s             |
| **Zoom Duration** | Speed of zoom animation in Zoom mode (0.5–5s)      | 1.5s           |
| **Camera**        | Pan direction or zoom                              | Left → Right   |
| **Enter**         | Blur, slide from top/bottom/left/right, or none    | Blur           |
| **Exit**          | Blur, slide to top/bottom/left/right, or none      | None           |
| **Background**    | Dominant color fill or blurred image               | Dominant Color |
| **VCR Effect**    | VHS tape visual overlay                            | Off            |
| **Attribution**   | Lower third text overlay                           | Empty          |
| **Output Format** | Landscape (16:9), Portrait (9:16), or Square (1:1) | Landscape      |
| **Framerate**     | 24, 30, or 60 fps                                  | 30 fps         |

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
    {
      "text": "Hello",
      "left": 100,
      "top": 50,
      "width": 80,
      "height": 20,
      "confidence": 95
    }
  ],
  "backgroundColor": [255, 255, 255],
  "imageWidth": 1920,
  "imageHeight": 1080
}
```

### `POST /api/render-stream`

Render a highlight video with real-time progress via SSE.

**Request**:

```json
{
  "filename": "uuid.png",
  "selectedWords": [...],
  "zoomBox": null,
  "backgroundColor": [255, 255, 255],
  "imageWidth": 1920,
  "imageHeight": 1080,
  "highlightColor": "rgba(255, 230, 0, 0.3)",
  "markingMode": "highlight",
  "leadInSeconds": 1,
  "charsPerSecond": 15,
  "leadOutSeconds": 2,
  "zoomDurationSeconds": 1.5,
  "blurredBackground": false,
  "cameraMovement": "left-right",
  "enterAnimation": "blur",
  "exitAnimation": "none",
  "vcrEffect": false,
  "attributionText": "",
  "outputFormat": "landscape",
  "frameRate": 30
}
```

**Response**: Server-sent event stream with progress updates:

```
data: {"progress": 50, "message": "Rendering frames...", "stage": "rendering"}
data: {"progress": 100, "message": "Done", "stage": "done", "videoPath": "/output/uuid.mp4"}
```

## Launch from macOS Dock

You can create an Automator app to launch B-Magic with a single click from the Dock.

1. Open **Automator** and create a new **Application**
2. Add a **Run Shell Script** action and set the shell to `/bin/zsh`
3. Paste the following (adjust the path to your project):

```bash
cd ~/repos/remotion-highlights
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
bun run dev &
sleep 2
open http://localhost:5173
```

4. Save the app (e.g. to `/Applications/B-Magic.app`)
5. Drag it to your Dock

To set a custom icon: right-click the app in Finder, click **Get Info**, then drag an `.icns` or image file onto the icon in the top-left corner of the info window.

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
