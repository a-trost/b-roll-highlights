import { useState, useCallback, useEffect, useRef } from "react";
import { WandSparkles, Highlighter, Circle, Underline, Focus, ZoomIn, Settings as SettingsIcon } from "lucide-react";
import { useFavicon } from "./hooks/useFavicon";
import { useHistory } from "./hooks/useHistory";
import { ImageUploader } from "./components/ImageUploader";
import { WordSelector } from "./components/WordSelector";
import { VideoPreview } from "./components/VideoPreview";
import { PresetsPanel } from "./components/PresetsPanel";
import type {
  WordBox,
  OCRResult,
  UploadResponse,
  MarkingMode,
  CameraMovement,
  EnterAnimation,
  ExitAnimation,
  ZoomBox,
  OutputFormat,
} from "./types";
import { FormatSelector } from "./components/FormatSelector";
import { SettingsModal } from "./components/SettingsModal";
import {
  DEFAULT_LEAD_IN_SECONDS,
  DEFAULT_LEAD_OUT_SECONDS,
  MIN_LEAD_SECONDS,
  MAX_LEAD_SECONDS,
  DEFAULT_CHARS_PER_SECOND,
  MIN_CHARS_PER_SECOND,
  MAX_CHARS_PER_SECOND,
  DEFAULT_ZOOM_DURATION_SECONDS,
  MIN_ZOOM_DURATION_SECONDS,
  MAX_ZOOM_DURATION_SECONDS,
  getHighlightColors,
  getCircleColors,
  isDarkBackground,
} from "./types";

type Status = {
  type: "info" | "error" | "success";
  message: string;
} | null;

export type Settings = {
  colorIndex: number;
  markingMode: MarkingMode;
  leadInSeconds: number;
  charsPerSecond: number;
  leadOutSeconds: number;
  zoomDurationSeconds: number;
  blurredBackground: boolean;
  cameraMovement: CameraMovement;
  enterAnimation: EnterAnimation;
  exitAnimation: ExitAnimation;
  vcrEffect: boolean;
  attributionText: string;
  attributionBgColor: string;
  attributionTextColor: string;
  outputFormat: OutputFormat;
  frameRate: 24 | 30 | 60;
};

type ImageState = {
  sourceName: string;
  filename: string;
  imagePath: string;
  words: WordBox[];
  selectedWords: WordBox[];
  zoomBox: ZoomBox | null;
  backgroundColor: [number, number, number];
  imageWidth: number;
  imageHeight: number;
  settings: Settings;
  videoPath: string | null;
  renderTime: number | null;
};

type StoredState = {
  image: ImageState | null;
};

const STORAGE_KEY = "broll-state-v2";

const createDefaultSettings = (): Settings => ({
  colorIndex: 0,
  markingMode: "highlight",
  leadInSeconds: DEFAULT_LEAD_IN_SECONDS,
  charsPerSecond: DEFAULT_CHARS_PER_SECOND,
  leadOutSeconds: DEFAULT_LEAD_OUT_SECONDS,
  zoomDurationSeconds: DEFAULT_ZOOM_DURATION_SECONDS,
  blurredBackground: false,
  cameraMovement: "left-right",
  enterAnimation: "blur",
  exitAnimation: "none",
  vcrEffect: false,
  attributionText: "",
  attributionBgColor: "#E8C6FE",
  attributionTextColor: "#333333",
  outputFormat: "landscape",
  frameRate: 30,
});

const loadState = (): ImageState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed.image) return null;
    // Ensure settings have all required fields (handles old saved state)
    return {
      ...parsed.image,
      settings: {
        ...createDefaultSettings(),
        ...parsed.image.settings,
      },
    };
  } catch {
    return null;
  }
};

const saveState = (image: ImageState | null) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ image }));
};

export type Preset = {
  id: string;
  name: string;
  settings: Settings;
  createdAt: number;
  updatedAt: number;
};

const PRESETS_STORAGE_KEY = "broll-presets-v1";

const DEFAULT_PRESETS: Preset[] = [
  {
    id: "preset-classic-highlight",
    name: "Classic Highlight",
    settings: {
      colorIndex: 0,
      markingMode: "highlight",
      leadInSeconds: 1,
      charsPerSecond: 15,
      leadOutSeconds: 2,
      zoomDurationSeconds: 1.5,
      blurredBackground: false,
      cameraMovement: "left-right",
      enterAnimation: "blur",
      exitAnimation: "none",
      vcrEffect: false,
      attributionText: "",
      attributionBgColor: "#E8C6FE",
      attributionTextColor: "#333333",
      outputFormat: "landscape",
      frameRate: 30,
    },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "preset-slow-reveal",
    name: "Slow Reveal",
    settings: {
      colorIndex: 0,
      markingMode: "unblur",
      leadInSeconds: 2,
      charsPerSecond: 8,
      leadOutSeconds: 3,
      zoomDurationSeconds: 1.5,
      blurredBackground: false,
      cameraMovement: "zoom-in",
      enterAnimation: "blur",
      exitAnimation: "blur",
      vcrEffect: false,
      attributionText: "",
      attributionBgColor: "#E8C6FE",
      attributionTextColor: "#333333",
      outputFormat: "landscape",
      frameRate: 30,
    },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "preset-red-pen-editor",
    name: "Red Pen Editor",
    settings: {
      colorIndex: 0,
      markingMode: "circle",
      leadInSeconds: 0.5,
      charsPerSecond: 20,
      leadOutSeconds: 1.5,
      zoomDurationSeconds: 1.5,
      blurredBackground: false,
      cameraMovement: "none",
      enterAnimation: "none",
      exitAnimation: "none",
      vcrEffect: false,
      attributionText: "",
      attributionBgColor: "#E8C6FE",
      attributionTextColor: "#333333",
      outputFormat: "landscape",
      frameRate: 30,
    },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "preset-retro-vhs",
    name: "Retro VHS",
    settings: {
      colorIndex: 2,
      markingMode: "highlight",
      leadInSeconds: 1.5,
      charsPerSecond: 12,
      leadOutSeconds: 2,
      zoomDurationSeconds: 1.5,
      blurredBackground: false,
      cameraMovement: "up-down",
      enterAnimation: "from-bottom",
      exitAnimation: "to-top",
      vcrEffect: true,
      attributionText: "",
      attributionBgColor: "#E8C6FE",
      attributionTextColor: "#333333",
      outputFormat: "landscape",
      frameRate: 30,
    },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "preset-quick-underline",
    name: "Quick Underline",
    settings: {
      colorIndex: 1,
      markingMode: "underline",
      leadInSeconds: 0.5,
      charsPerSecond: 30,
      leadOutSeconds: 1,
      zoomDurationSeconds: 1.5,
      blurredBackground: false,
      cameraMovement: "left-right",
      enterAnimation: "from-left",
      exitAnimation: "to-right",
      vcrEffect: false,
      attributionText: "",
      attributionBgColor: "#E8C6FE",
      attributionTextColor: "#333333",
      outputFormat: "landscape",
      frameRate: 30,
    },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "preset-cinematic",
    name: "Cinematic",
    settings: {
      colorIndex: 3,
      markingMode: "highlight",
      leadInSeconds: 2.5,
      charsPerSecond: 10,
      leadOutSeconds: 3,
      zoomDurationSeconds: 1.5,
      blurredBackground: false,
      cameraMovement: "zoom-out",
      enterAnimation: "blur",
      exitAnimation: "blur",
      vcrEffect: false,
      attributionText: "",
      attributionBgColor: "#E8C6FE",
      attributionTextColor: "#333333",
      outputFormat: "landscape",
      frameRate: 30,
    },
    createdAt: 0,
    updatedAt: 0,
  },
];

const loadPresets = (): Preset[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return DEFAULT_PRESETS;
    return JSON.parse(raw) as Preset[];
  } catch {
    return DEFAULT_PRESETS;
  }
};

const savePresets = (presets: Preset[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
};

function HexInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = (raw: string) => {
    let v = raw.trim();
    if (!v.startsWith("#")) v = "#" + v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      onChange(v);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  return (
    <input
      type="text"
      className="color-hex-input"
      value={draft}
      onFocus={(e) => {
        setEditing(true);
        e.target.select();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
      }}
    />
  );
}

function App() {
  const { state: image, setState: setImage, push: pushImage, undo, redo } = useHistory<ImageState | null>(loadState());
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ value: number; message: string } | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [presets, setPresets] = useState<Preset[]>(() => loadPresets());
  const [showSettings, setShowSettings] = useState(false);
  const imageRef = useRef(image);

  useEffect(() => {
    imageRef.current = image;
  }, [image]);

  useEffect(() => {
    saveState(image);
  }, [image]);

  useEffect(() => {
    savePresets(presets);
  }, [presets]);

  const hasVideo = Boolean(image?.videoPath);
  const canRender = image && (image.selectedWords.length > 0 || image.zoomBox !== null);

  useFavicon(isRendering, hasVideo);

  const handleUpload = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    const file = imageFiles[0];
    setIsUploading(true);
    setStatus({ type: "info", message: "Uploading image..." });

    try {
      const formData = new FormData();
      formData.append("image", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      const uploadData: UploadResponse = await uploadRes.json();

      setIsUploading(false);
      setIsProcessingOCR(true);
      setStatus({ type: "info", message: "Processing image with OCR..." });

      const ocrRes = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: uploadData.filename }),
      });

      if (!ocrRes.ok) {
        throw new Error("OCR processing failed");
      }

      const ocrData: OCRResult = await ocrRes.json();

      setImage({
        sourceName: file.name,
        filename: uploadData.filename,
        imagePath: uploadData.path,
        words: ocrData.words,
        selectedWords: [],
        zoomBox: null,
        backgroundColor: ocrData.backgroundColor,
        imageWidth: ocrData.imageWidth,
        imageHeight: ocrData.imageHeight,
        settings: createDefaultSettings(),
        videoPath: null,
        renderTime: null,
      });

      setStatus({
        type: "success",
        message: `Found ${ocrData.words.length} words. ${isDarkBackground(ocrData.backgroundColor) ? "Dark" : "Light"} image detected.`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Upload failed",
      });
    } finally {
      setIsUploading(false);
      setIsProcessingOCR(false);
    }
  }, []);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleUpload([file]);
          }
          break;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handleUpload]);

  const getColors = useCallback(() => {
    if (!image) return { availableColors: [], colorIndex: 0, selectedColor: "" };
    const availableColors =
      image.settings.markingMode === "highlight" || image.settings.markingMode === "unblur"
        ? getHighlightColors(image.backgroundColor)
        : getCircleColors(image.backgroundColor);
    const colorIndex = Math.min(image.settings.colorIndex, availableColors.length - 1);
    const selectedColor = availableColors[colorIndex]?.value ?? availableColors[0].value;
    return { availableColors, colorIndex, selectedColor };
  }, [image]);

  const handleRender = useCallback(async () => {
    const currentImage = imageRef.current;
    if (!currentImage || (currentImage.selectedWords.length === 0 && !currentImage.zoomBox)) return;

    const { selectedColor } = getColors();

    setIsRendering(true);
    setRenderProgress({ value: 0, message: "Starting render..." });
    setStatus({ type: "info", message: "Starting render..." });

    const startTime = Date.now();
    try {
      const res = await fetch("/api/render-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: currentImage.filename,
          selectedWords: currentImage.selectedWords,
          zoomBox: currentImage.zoomBox,
          backgroundColor: currentImage.backgroundColor,
          imageWidth: currentImage.imageWidth,
          imageHeight: currentImage.imageHeight,
          highlightColor: selectedColor,
          markingMode: currentImage.settings.markingMode,
          leadInSeconds: currentImage.settings.leadInSeconds,
          charsPerSecond: currentImage.settings.charsPerSecond,
          leadOutSeconds: currentImage.settings.leadOutSeconds,
          zoomDurationSeconds: currentImage.settings.zoomDurationSeconds,
          blurredBackground: currentImage.settings.blurredBackground,
          cameraMovement: currentImage.settings.cameraMovement,
          enterAnimation: currentImage.settings.enterAnimation,
          exitAnimation: currentImage.settings.exitAnimation,
          vcrEffect: currentImage.settings.vcrEffect,
          attributionText: currentImage.settings.attributionText,
          attributionBgColor: currentImage.settings.attributionBgColor,
          attributionTextColor: currentImage.settings.attributionTextColor,
          outputFormat: currentImage.settings.outputFormat,
          frameRate: currentImage.settings.frameRate,
        }),
      });

      if (!res.ok) {
        throw new Error("Render failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let videoPath: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              setRenderProgress({ value: data.progress, message: data.message });
              setStatus({ type: "info", message: "Rendering..." });

              if (data.videoPath) {
                videoPath = data.videoPath;
              }

              if (data.stage === "error") {
                throw new Error(data.message);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      if (videoPath) {
        setImage((prev) =>
          prev
            ? {
                ...prev,
                videoPath,
                renderTime: Date.now() - startTime,
              }
            : null
        );
        setStatus({ type: "success", message: "Video rendered successfully!" });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Render failed",
      });
    } finally {
      setIsRendering(false);
      setRenderProgress(null);
    }
  }, [getColors]);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    pushImage((prev) =>
      prev
        ? {
            ...prev,
            settings: { ...prev.settings, ...partial },
            videoPath: null,
            renderTime: null,
          }
        : null
    );
  }, [pushImage]);

  const handleSavePreset = useCallback(
    (name: string) => {
      if (!image) return;
      const preset: Preset = {
        id: crypto.randomUUID(),
        name,
        settings: { ...image.settings },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setPresets((prev) => [...prev, preset]);
    },
    [image]
  );

  const handleLoadPreset = useCallback(
    (preset: Preset) => {
      // Handle old presets that don't have outputFormat/frameRate
      const settings: Settings = {
        ...preset.settings,
        outputFormat: preset.settings.outputFormat ?? 'landscape',
        frameRate: preset.settings.frameRate ?? 30,
      };
      updateSettings(settings);
    },
    [updateSettings]
  );

  const handleOverwritePreset = useCallback(
    (id: string) => {
      if (!image) return;
      setPresets((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, settings: { ...image.settings }, updatedAt: Date.now() } : p
        )
      );
    },
    [image]
  );

  const handleRenamePreset = useCallback((id: string, newName: string) => {
    setPresets((prev) => prev.map((p) => (p.id === id ? { ...p, name: newName } : p)));
  }, []);

  const handleDeletePreset = useCallback((id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getProgressState = useCallback(() => {
    if (isUploading) {
      return { label: "Uploading", detail: "Uploading image", value: 20 };
    }
    if (isProcessingOCR) {
      return { label: "OCR", detail: "Processing text", value: 45 };
    }
    if (isRendering && renderProgress) {
      return { label: "Rendering", detail: renderProgress.message, value: renderProgress.value };
    }
    if (isRendering) {
      return { label: "Rendering", detail: "Starting...", value: 0 };
    }
    return null;
  }, [isUploading, isProcessingOCR, isRendering, renderProgress]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (canRender && !isRendering) {
          e.preventDefault();
          handleRender();
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (image?.videoPath) {
          const link = document.createElement("a");
          link.href = image.videoPath;
          link.download = "";
          link.click();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canRender, isRendering, handleRender, image?.videoPath, undo, redo]);

  const { availableColors, colorIndex, selectedColor } = getColors();
  const progressState = getProgressState();

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo"><WandSparkles size={20} /></div>
          <h1>B-Magic</h1>
        </div>
        {status && <div className={`status status-header ${status.type}`}>{status.message}</div>}
        <button className="btn-ghost btn-icon" onClick={() => setShowSettings(true)} title="Settings">
          <SettingsIcon size={16} />
        </button>
      </header>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />

      {!image ? (
        <ImageUploader onUpload={handleUpload} isUploading={isUploading} />
      ) : (
        <div className="editor-layout">
          <div className="editor-main">
            <div className="mode-selector">
              <div className="mode-toggle">
                <button
                  className={`mode-btn ${image.settings.markingMode === "highlight" ? "active" : ""}`}
                  onClick={() => updateSettings({ markingMode: "highlight", colorIndex: 0 })}
                >
                  <Highlighter size={16} />
                  Highlight
                </button>
                <button
                  className={`mode-btn ${image.settings.markingMode === "circle" ? "active" : ""}`}
                  onClick={() => updateSettings({ markingMode: "circle", colorIndex: 0 })}
                >
                  <Circle size={16} />
                  Circle
                </button>
                <button
                  className={`mode-btn ${image.settings.markingMode === "underline" ? "active" : ""}`}
                  onClick={() => updateSettings({ markingMode: "underline", colorIndex: 0 })}
                >
                  <Underline size={16} />
                  Underline
                </button>
                <button
                  className={`mode-btn ${image.settings.markingMode === "unblur" ? "active" : ""}`}
                  onClick={() => updateSettings({ markingMode: "unblur", colorIndex: 0 })}
                >
                  <Focus size={16} />
                  Unblur
                </button>
                <button
                  className={`mode-btn ${image.settings.markingMode === "zoom" ? "active" : ""}`}
                  onClick={() => updateSettings({ markingMode: "zoom" })}
                >
                  <ZoomIn size={16} />
                  Zoom
                </button>
              </div>
              {image.settings.markingMode !== "zoom" && image.settings.markingMode !== "unblur" && (
                <div className="mode-color-picker">
                  <span className="color-preview" style={{ backgroundColor: selectedColor }} />
                  <select
                    id="color-select"
                    value={colorIndex}
                    onChange={(e) => updateSettings({ colorIndex: parseInt(e.target.value, 10) })}
                  >
                    {availableColors.map((color, idx) => (
                      <option key={color.name} value={idx}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {isUploading || isProcessingOCR ? (
              <div className="loading">
                <div className="spinner" />
                <span>{isUploading ? "Uploading image..." : "Processing image with OCR..."}</span>
              </div>
            ) : (
              <WordSelector
                imageSrc={image.imagePath}
                words={image.words}
                selectedWords={image.selectedWords}
                onSelectionChange={(words) => pushImage((prev) => (prev ? { ...prev, selectedWords: words, videoPath: null, renderTime: null } : null))}
                zoomBox={image.zoomBox}
                onZoomBoxChange={(zoomBox) => pushImage((prev) => (prev ? { ...prev, zoomBox, videoPath: null, renderTime: null } : null))}
                imageWidth={image.imageWidth}
                imageHeight={image.imageHeight}
                markingMode={image.settings.markingMode}
                highlightColor={selectedColor}
                outputFormat={image.settings.outputFormat}
                onNewImage={() => {
                  setImage(null);
                  setStatus(null);
                }}
              />
            )}

            <div className="settings-panel">
              <div className="settings-section">
                <h3 className="settings-section-title">Timing</h3>
                <div className="settings-grid">
                  <div className="slider-control">
                    <div className="slider-header">
                      <span className="slider-label">Lead In</span>
                      <span className="slider-value">{image.settings.leadInSeconds}s</span>
                    </div>
                    <input
                      type="range"
                      min={MIN_LEAD_SECONDS}
                      max={MAX_LEAD_SECONDS}
                      step={0.5}
                      value={image.settings.leadInSeconds}
                      onChange={(e) => updateSettings({ leadInSeconds: parseFloat(e.target.value) })}
                    />
                  </div>
                  {image.settings.markingMode !== "zoom" && (
                    <div className="slider-control">
                      <div className="slider-header">
                        <span className="slider-label">Speed</span>
                        <span className="slider-value">{image.settings.charsPerSecond} chr/s</span>
                      </div>
                      <input
                        type="range"
                        min={MIN_CHARS_PER_SECOND}
                        max={MAX_CHARS_PER_SECOND}
                        step={1}
                        value={image.settings.charsPerSecond}
                        onChange={(e) => updateSettings({ charsPerSecond: parseInt(e.target.value, 10) })}
                      />
                    </div>
                  )}
                  {image.settings.markingMode === "zoom" && (
                    <div className="slider-control">
                      <div className="slider-header">
                        <span className="slider-label">Zoom Duration</span>
                        <span className="slider-value">{image.settings.zoomDurationSeconds}s</span>
                      </div>
                      <input
                        type="range"
                        min={MIN_ZOOM_DURATION_SECONDS}
                        max={MAX_ZOOM_DURATION_SECONDS}
                        step={0.1}
                        value={image.settings.zoomDurationSeconds}
                        onChange={(e) => updateSettings({ zoomDurationSeconds: parseFloat(e.target.value) })}
                      />
                    </div>
                  )}
                  <div className="slider-control">
                    <div className="slider-header">
                      <span className="slider-label">Lead Out</span>
                      <span className="slider-value">{image.settings.leadOutSeconds}s</span>
                    </div>
                    <input
                      type="range"
                      min={MIN_LEAD_SECONDS}
                      max={MAX_LEAD_SECONDS}
                      step={0.5}
                      value={image.settings.leadOutSeconds}
                      onChange={(e) => updateSettings({ leadOutSeconds: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">Effects</h3>
                <div className="settings-row">
                  <div className="setting-group">
                    <label className="setting-label" htmlFor="camera-select">
                      Camera
                    </label>
                    <select
                      id="camera-select"
                      className="select-input"
                      value={image.settings.cameraMovement}
                      onChange={(e) => updateSettings({ cameraMovement: e.target.value as CameraMovement })}
                    >
                      <option value="left-right">Left → Right</option>
                      <option value="right-left">Right → Left</option>
                      <option value="up-down">Up → Down</option>
                      <option value="down-up">Down → Up</option>
                      <option value="zoom-in">Zoom In</option>
                      <option value="zoom-out">Zoom Out</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div className="setting-group">
                    <label className="setting-label" htmlFor="enter-select">
                      Enter
                    </label>
                    <select
                      id="enter-select"
                      className="select-input"
                      value={image.settings.enterAnimation}
                      onChange={(e) => updateSettings({ enterAnimation: e.target.value as EnterAnimation })}
                    >
                      <option value="blur">Blur</option>
                      <option value="from-bottom">From Bottom</option>
                      <option value="from-top">From Top</option>
                      <option value="from-left">From Left</option>
                      <option value="from-right">From Right</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div className="setting-group">
                    <label className="setting-label" htmlFor="exit-select">
                      Exit
                    </label>
                    <select
                      id="exit-select"
                      className="select-input"
                      value={image.settings.exitAnimation}
                      onChange={(e) => updateSettings({ exitAnimation: e.target.value as ExitAnimation })}
                    >
                      <option value="blur">Blur</option>
                      <option value="to-bottom">To Bottom</option>
                      <option value="to-top">To Top</option>
                      <option value="to-left">To Left</option>
                      <option value="to-right">To Right</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div className="setting-group">
                    <label className="setting-label" htmlFor="background-select">
                      Background
                    </label>
                    <select
                      id="background-select"
                      className="select-input"
                      value={image.settings.blurredBackground ? "blurred" : "dominant"}
                      onChange={(e) => updateSettings({ blurredBackground: e.target.value === "blurred" })}
                    >
                      <option value="dominant">Dominant Color</option>
                      <option value="blurred">Blurred Image</option>
                    </select>
                  </div>
                  <div className="setting-group">
                    <label className="setting-label" htmlFor="overlay-select">
                      Overlay
                    </label>
                    <select
                      id="overlay-select"
                      className="select-input"
                      value={image.settings.vcrEffect ? "vcr" : "none"}
                      onChange={(e) => updateSettings({ vcrEffect: e.target.value === "vcr" })}
                    >
                      <option value="none">None</option>
                      <option value="vcr">VCR Effect</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">Attribution</h3>
                <div className="attribution-row">
                  <div className="setting-group" style={{ flex: 1, minWidth: 0 }}>
                    <label className="setting-label" htmlFor="attribution-input">
                      Lower Third Text
                    </label>
                    <input
                      type="text"
                      id="attribution-input"
                      className="text-input"
                      placeholder="e.g., via @username or Source: example.com"
                      value={image.settings.attributionText}
                      onChange={(e) => updateSettings({ attributionText: e.target.value })}
                    />
                  </div>
                  <div className="setting-group">
                    <label className="setting-label" htmlFor="attribution-bg-color">
                      Background
                    </label>
                    <div className="color-input-wrapper">
                      <input
                        type="color"
                        id="attribution-bg-color"
                        value={image.settings.attributionBgColor}
                        onChange={(e) => updateSettings({ attributionBgColor: e.target.value })}
                      />
                      <HexInput
                        value={image.settings.attributionBgColor}
                        onChange={(v) => updateSettings({ attributionBgColor: v })}
                      />
                    </div>
                  </div>
                  <div className="setting-group">
                    <label className="setting-label" htmlFor="attribution-text-color">
                      Text
                    </label>
                    <div className="color-input-wrapper">
                      <input
                        type="color"
                        id="attribution-text-color"
                        value={image.settings.attributionTextColor}
                        onChange={(e) => updateSettings({ attributionTextColor: e.target.value })}
                      />
                      <HexInput
                        value={image.settings.attributionTextColor}
                        onChange={(v) => updateSettings({ attributionTextColor: v })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="settings-actions">
                <button
                  className="btn btn-primary btn-generate"
                  onClick={handleRender}
                  disabled={!canRender || isRendering}
                >
                  {isRendering ? (
                    <>
                      <span className="btn-spinner"></span>
                      Rendering...
                    </>
                  ) : (
                    <>
                      Generate Video
                      <span className="keyboard-shortcut">⌘↵</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="editor-sidebar">
            <VideoPreview videoPath={image.videoPath} isRendering={isRendering} renderTime={image.renderTime} renderProgress={progressState} />
            <div className="settings-section">
              <h3 className="settings-section-title">Output Format</h3>
              <FormatSelector
                value={image.settings.outputFormat}
                onChange={(format) => updateSettings({ outputFormat: format })}
                frameRate={image.settings.frameRate}
                onFrameRateChange={(fps) => updateSettings({ frameRate: fps })}
              />
            </div>
            <PresetsPanel
              presets={presets}
              onSave={handleSavePreset}
              onLoad={handleLoadPreset}
              onOverwrite={handleOverwritePreset}
              onRename={handleRenamePreset}
              onDelete={handleDeletePreset}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
