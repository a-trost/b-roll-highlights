import { useState, useCallback, useEffect, useRef } from "react";
import { useFavicon } from "./hooks/useFavicon";
import { ImageUploader } from "./components/ImageUploader";
import { WordSelector } from "./components/WordSelector";
import { VideoPreview } from "./components/VideoPreview";
import type {
  WordBox,
  OCRResult,
  UploadResponse,
  RenderResponse,
  MarkingMode,
  CameraMovement,
  EnterAnimation,
  ExitAnimation,
  ZoomBox,
} from "./types";
import {
  DEFAULT_LEAD_IN_SECONDS,
  DEFAULT_LEAD_OUT_SECONDS,
  MIN_LEAD_SECONDS,
  MAX_LEAD_SECONDS,
  DEFAULT_CHARS_PER_SECOND,
  MIN_CHARS_PER_SECOND,
  MAX_CHARS_PER_SECOND,
  DEFAULT_UNBLUR_SECONDS,
  MIN_UNBLUR_SECONDS,
  MAX_UNBLUR_SECONDS,
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

type Settings = {
  colorIndex: number;
  markingMode: MarkingMode;
  leadInSeconds: number;
  charsPerSecond: number;
  leadOutSeconds: number;
  unblurSeconds: number;
  zoomDurationSeconds: number;
  blurredBackground: boolean;
  cameraMovement: CameraMovement;
  enterAnimation: EnterAnimation;
  exitAnimation: ExitAnimation;
  vcrEffect: boolean;
  attributionText: string;
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
  unblurSeconds: DEFAULT_UNBLUR_SECONDS,
  zoomDurationSeconds: DEFAULT_ZOOM_DURATION_SECONDS,
  blurredBackground: false,
  cameraMovement: "left-right",
  enterAnimation: "blur",
  exitAnimation: "none",
  vcrEffect: false,
  attributionText: "",
});

const loadState = (): ImageState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    return parsed.image ?? null;
  } catch {
    return null;
  }
};

const saveState = (image: ImageState | null) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ image }));
};

function App() {
  const [image, setImage] = useState<ImageState | null>(() => loadState());
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const imageRef = useRef(image);

  useEffect(() => {
    imageRef.current = image;
  }, [image]);

  useEffect(() => {
    saveState(image);
  }, [image]);

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
    setStatus({ type: "info", message: "Rendering video... This may take a moment." });

    const startTime = Date.now();
    try {
      const res = await fetch("/api/render", {
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
          unblurSeconds: currentImage.settings.unblurSeconds,
          attributionText: currentImage.settings.attributionText,
        }),
      });

      if (!res.ok) {
        throw new Error("Render failed");
      }

      const data: RenderResponse = await res.json();
      setImage((prev) =>
        prev
          ? {
              ...prev,
              videoPath: data.videoPath,
              renderTime: Date.now() - startTime,
            }
          : null
      );
      setStatus({ type: "success", message: "Video rendered successfully!" });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Render failed",
      });
    } finally {
      setIsRendering(false);
    }
  }, [getColors]);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setImage((prev) =>
      prev
        ? {
            ...prev,
            settings: { ...prev.settings, ...partial },
          }
        : null
    );
  }, []);

  const getProgressState = useCallback(() => {
    if (isUploading) {
      return { label: "Uploading", detail: "Uploading image", value: 20 };
    }
    if (isProcessingOCR) {
      return { label: "OCR", detail: "Processing text", value: 45 };
    }
    if (isRendering) {
      return { label: "Rendering", detail: "Rendering video", value: 80 };
    }
    return null;
  }, [isUploading, isProcessingOCR, isRendering]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [canRender, isRendering, handleRender, image?.videoPath]);

  const { availableColors, colorIndex, selectedColor } = getColors();
  const progressState = getProgressState();

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">✦</div>
        <h1>B-Roll Highlights</h1>
      </header>

      {!image ? (
        <>
          <ImageUploader onUpload={handleUpload} isUploading={isUploading} />
          {status && <div className={`status ${status.type}`}>{status.message}</div>}
        </>
      ) : (
        <div className="editor-layout">
          <div className="editor-main">
            <div className="editor-header">
              <div>
                <h2 className="editor-title">{image.sourceName}</h2>
                <div className="editor-meta">
                  {image.words.length} words · {image.selectedWords.length} selected
                </div>
              </div>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => {
                  setImage(null);
                  setStatus(null);
                }}
              >
                New Image
              </button>
            </div>

            {progressState && (
              <div className="progress-panel">
                <div className="progress-panel-header">
                  <span className="progress-panel-label">{progressState.label}</span>
                  <span className="progress-panel-value">{progressState.detail}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progressState.value}%` }} />
                </div>
              </div>
            )}

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
                onSelectionChange={(words) => setImage((prev) => (prev ? { ...prev, selectedWords: words } : null))}
                zoomBox={image.zoomBox}
                onZoomBoxChange={(zoomBox) => setImage((prev) => (prev ? { ...prev, zoomBox } : null))}
                imageWidth={image.imageWidth}
                imageHeight={image.imageHeight}
                markingMode={image.settings.markingMode}
                highlightColor={selectedColor}
              />
            )}

            <div className="settings-panel">
              <div className="settings-section">
                <h3 className="settings-section-title">Style</h3>
                <div className="settings-row">
                  <div className="setting-group">
                    <span className="setting-label">Mode</span>
                    <div className="mode-toggle">
                      <button
                        className={`mode-btn ${image.settings.markingMode === "highlight" ? "active" : ""}`}
                        onClick={() => updateSettings({ markingMode: "highlight", colorIndex: 0 })}
                      >
                        <span className="mode-icon">◼</span>
                        Highlight
                      </button>
                      <button
                        className={`mode-btn ${image.settings.markingMode === "circle" ? "active" : ""}`}
                        onClick={() => updateSettings({ markingMode: "circle", colorIndex: 0 })}
                      >
                        <span className="mode-icon">○</span>
                        Circle
                      </button>
                      <button
                        className={`mode-btn ${image.settings.markingMode === "underline" ? "active" : ""}`}
                        onClick={() => updateSettings({ markingMode: "underline", colorIndex: 0 })}
                      >
                        <span className="mode-icon">_</span>
                        Underline
                      </button>
                      <button
                        className={`mode-btn ${image.settings.markingMode === "unblur" ? "active" : ""}`}
                        onClick={() => updateSettings({ markingMode: "unblur", colorIndex: 0 })}
                      >
                        <span className="mode-icon">◧</span>
                        Unblur
                      </button>
                      <button
                        className={`mode-btn ${image.settings.markingMode === "zoom" ? "active" : ""}`}
                        onClick={() => updateSettings({ markingMode: "zoom" })}
                      >
                        <span className="mode-icon">⊕</span>
                        Zoom
                      </button>
                    </div>
                  </div>
                  {image.settings.markingMode !== "zoom" && (
                    <div className="setting-group">
                      <label className="setting-label" htmlFor="color-select">
                        {image.settings.markingMode === "highlight" || image.settings.markingMode === "unblur"
                          ? "Highlight"
                          : "Pen"}{" "}
                        Color
                      </label>
                      <div className="color-select-wrapper">
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
                    </div>
                  )}
                </div>
              </div>

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
                  {image.settings.markingMode === "unblur" && (
                    <div className="slider-control">
                      <div className="slider-header">
                        <span className="slider-label">Unblur</span>
                        <span className="slider-value">{image.settings.unblurSeconds}s</span>
                      </div>
                      <input
                        type="range"
                        min={MIN_UNBLUR_SECONDS}
                        max={MAX_UNBLUR_SECONDS}
                        step={0.1}
                        value={image.settings.unblurSeconds}
                        onChange={(e) => updateSettings({ unblurSeconds: parseFloat(e.target.value) })}
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
                    <span className="setting-label">Background</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={image.settings.blurredBackground}
                        onChange={(e) => updateSettings({ blurredBackground: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-label">Blurred Image</span>
                    </label>
                  </div>
                  <div className="setting-group">
                    <span className="setting-label">Overlay</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={image.settings.vcrEffect}
                        onChange={(e) => updateSettings({ vcrEffect: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-label">VCR Effect</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">Attribution</h3>
                <div className="settings-row">
                  <div className="setting-group" style={{ flex: 1 }}>
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
            <VideoPreview videoPath={image.videoPath} isRendering={isRendering} renderTime={image.renderTime} />
          </div>

          {status && <div className={`status editor-status ${status.type}`}>{status.message}</div>}
        </div>
      )}
    </div>
  );
}

export default App;
