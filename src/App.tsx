import { useState, useCallback, useEffect } from "react";
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
  BlurMode,
} from "./types";
import {
  DEFAULT_LEAD_IN_SECONDS,
  DEFAULT_LEAD_OUT_SECONDS,
  MIN_LEAD_SECONDS,
  MAX_LEAD_SECONDS,
  DEFAULT_CHARS_PER_SECOND,
  MIN_CHARS_PER_SECOND,
  MAX_CHARS_PER_SECOND,
  getHighlightColors,
  getCircleColors,
  isDarkBackground,
} from "./types";

type Status = {
  type: "info" | "error" | "success";
  message: string;
} | null;

function App() {
  const [filename, setFilename] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [words, setWords] = useState<WordBox[]>([]);
  const [selectedWords, setSelectedWords] = useState<WordBox[]>([]);
  const [backgroundColor, setBackgroundColor] = useState<
    [number, number, number]
  >([255, 255, 255]);
  const [imageWidth, setImageWidth] = useState(1920);
  const [imageHeight, setImageHeight] = useState(1080);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  // Track color index separately so we can switch between light/dark palettes
  const [colorIndex, setColorIndex] = useState(0);
  const [markingMode, setMarkingMode] = useState<MarkingMode>("highlight");
  const [leadInSeconds, setLeadInSeconds] = useState(DEFAULT_LEAD_IN_SECONDS);
  const [charsPerSecond, setCharsPerSecond] = useState(DEFAULT_CHARS_PER_SECOND);
  const [leadOutSeconds, setLeadOutSeconds] = useState(
    DEFAULT_LEAD_OUT_SECONDS
  );
  const [blurredBackground, setBlurredBackground] = useState(false);
  const [cameraMovement, setCameraMovement] = useState<CameraMovement>("left-right");
  const [blurMode, setBlurMode] = useState<BlurMode>("blur-in");
  const [vcrEffect, setVcrEffect] = useState(false);
  const [attributionText, setAttributionText] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>(null);

  // Update favicon based on render state
  useFavicon(isRendering, !!videoPath);

  // Get appropriate colors based on mode and background brightness
  const isDark = isDarkBackground(backgroundColor);
  const availableColors =
    markingMode === "highlight"
      ? getHighlightColors(backgroundColor)
      : getCircleColors(backgroundColor); // circle and underline use same pen colors
  const selectedColor =
    availableColors[colorIndex]?.value ?? availableColors[0].value;

  const handleUpload = useCallback(async (file: File) => {
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
      setFilename(uploadData.filename);
      setImagePath(uploadData.path);
      setSelectedWords([]);
      setVideoPath(null);

      // Run OCR
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
      setWords(ocrData.words);
      setBackgroundColor(ocrData.backgroundColor);
      setImageWidth(ocrData.imageWidth);
      setImageHeight(ocrData.imageHeight);

      const imageIsDark = isDarkBackground(ocrData.backgroundColor);
      setStatus({
        type: "success",
        message: `Found ${ocrData.words.length} words. ${imageIsDark ? "Dark" : "Light"} image detected.`,
      });
    } catch (error) {
      console.error("Error:", error);
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsUploading(false);
      setIsProcessingOCR(false);
    }
  }, []);

  // Handle paste events for clipboard images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleUpload(file);
          }
          break;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handleUpload]);

  const handleRender = useCallback(async () => {
    if (!filename || selectedWords.length === 0) return;

    setIsRendering(true);
    setRenderTime(null);
    setStatus({
      type: "info",
      message: "Rendering video... This may take a moment.",
    });

    const startTime = Date.now();
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          selectedWords,
          backgroundColor,
          imageWidth,
          imageHeight,
          highlightColor: selectedColor,
          markingMode,
          leadInSeconds,
          charsPerSecond,
          leadOutSeconds,
          blurredBackground,
          cameraMovement,
          blurMode,
          vcrEffect,
          attributionText,
        }),
      });

      if (!res.ok) {
        throw new Error("Render failed");
      }

      const data: RenderResponse = await res.json();
      setVideoPath(data.videoPath);
      setRenderTime(Date.now() - startTime);
      setStatus({ type: "success", message: "Video rendered successfully!" });
    } catch (error) {
      console.error("Render error:", error);
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Render failed",
      });
    } finally {
      setIsRendering(false);
    }
  }, [
    filename,
    selectedWords,
    backgroundColor,
    imageWidth,
    imageHeight,
    selectedColor,
    markingMode,
    leadInSeconds,
    charsPerSecond,
    leadOutSeconds,
    blurredBackground,
    cameraMovement,
    blurMode,
    vcrEffect,
    attributionText,
  ]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Enter to render
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (selectedWords.length > 0 && !isRendering) {
          e.preventDefault();
          handleRender();
        }
      }
      // Cmd+S to download video
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        if (videoPath) {
          e.preventDefault();
          const link = document.createElement("a");
          link.href = videoPath;
          link.download = "";
          link.click();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedWords.length, isRendering, handleRender, videoPath]);

  const handleClearSelection = useCallback(() => {
    setSelectedWords([]);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">✦</div>
        <h1>B-Roll Highlights</h1>
      </header>

      {!imagePath ? (
        <ImageUploader onUpload={handleUpload} isUploading={isUploading} />
      ) : (
        <div className="container">
          <div>
            {isProcessingOCR ? (
              <div className="loading">
                <div className="spinner" />
                <span>Processing image with OCR...</span>
              </div>
            ) : (
              <>
                <WordSelector
                  imageSrc={imagePath}
                  words={words}
                  selectedWords={selectedWords}
                  onSelectionChange={setSelectedWords}
                  imageWidth={imageWidth}
                  imageHeight={imageHeight}
                  markingMode={markingMode}
                  highlightColor={selectedColor}
                />
                <div className="settings-panel">
                  {/* Style Section */}
                  <div className="settings-section">
                    <h3 className="settings-section-title">Style</h3>
                    <div className="settings-row">
                      <div className="setting-group">
                        <span className="setting-label">Mode</span>
                        <div className="mode-toggle">
                          <button
                            className={`mode-btn ${markingMode === "highlight" ? "active" : ""}`}
                            onClick={() => {
                              setMarkingMode("highlight");
                              setColorIndex(0);
                            }}
                          >
                            <span className="mode-icon">◼</span>
                            Highlight
                          </button>
                          <button
                            className={`mode-btn ${markingMode === "circle" ? "active" : ""}`}
                            onClick={() => {
                              setMarkingMode("circle");
                              setColorIndex(0);
                            }}
                          >
                            <span className="mode-icon">○</span>
                            Circle
                          </button>
                          <button
                            className={`mode-btn ${markingMode === "underline" ? "active" : ""}`}
                            onClick={() => {
                              setMarkingMode("underline");
                              setColorIndex(0);
                            }}
                          >
                            <span className="mode-icon">_</span>
                            Underline
                          </button>
                        </div>
                      </div>
                      <div className="setting-group">
                        <label className="setting-label" htmlFor="color-select">
                          {markingMode === "highlight" ? "Highlight" : "Pen"} Color
                        </label>
                        <div className="color-select-wrapper">
                          <span
                            className="color-preview"
                            style={{ backgroundColor: selectedColor }}
                          />
                          <select
                            id="color-select"
                            value={colorIndex}
                            onChange={(e) =>
                              setColorIndex(parseInt(e.target.value, 10))
                            }
                          >
                            {availableColors.map((color, index) => (
                              <option key={color.name} value={index}>
                                {color.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timing Section */}
                  <div className="settings-section">
                    <h3 className="settings-section-title">Timing</h3>
                    <div className="settings-grid">
                      <div className="slider-control">
                        <div className="slider-header">
                          <span className="slider-label">Lead In</span>
                          <span className="slider-value">{leadInSeconds}s</span>
                        </div>
                        <input
                          type="range"
                          id="lead-in"
                          min={MIN_LEAD_SECONDS}
                          max={MAX_LEAD_SECONDS}
                          step={0.5}
                          value={leadInSeconds}
                          onChange={(e) =>
                            setLeadInSeconds(parseFloat(e.target.value))
                          }
                        />
                      </div>
                      <div className="slider-control">
                        <div className="slider-header">
                          <span className="slider-label">Speed</span>
                          <span className="slider-value">{charsPerSecond} chr/s</span>
                        </div>
                        <input
                          type="range"
                          id="chars-per-second"
                          min={MIN_CHARS_PER_SECOND}
                          max={MAX_CHARS_PER_SECOND}
                          step={1}
                          value={charsPerSecond}
                          onChange={(e) =>
                            setCharsPerSecond(parseInt(e.target.value, 10))
                          }
                        />
                      </div>
                      <div className="slider-control">
                        <div className="slider-header">
                          <span className="slider-label">Lead Out</span>
                          <span className="slider-value">{leadOutSeconds}s</span>
                        </div>
                        <input
                          type="range"
                          id="lead-out"
                          min={MIN_LEAD_SECONDS}
                          max={MAX_LEAD_SECONDS}
                          step={0.5}
                          value={leadOutSeconds}
                          onChange={(e) =>
                            setLeadOutSeconds(parseFloat(e.target.value))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Effects Section */}
                  <div className="settings-section">
                    <h3 className="settings-section-title">Effects</h3>
                    <div className="settings-row">
                      <div className="setting-group">
                        <label className="setting-label" htmlFor="camera-movement">Camera</label>
                        <select
                          id="camera-movement"
                          className="select-input"
                          value={cameraMovement}
                          onChange={(e) =>
                            setCameraMovement(e.target.value as CameraMovement)
                          }
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
                        <label className="setting-label" htmlFor="blur-mode">Blur</label>
                        <select
                          id="blur-mode"
                          className="select-input"
                          value={blurMode}
                          onChange={(e) =>
                            setBlurMode(e.target.value as BlurMode)
                          }
                        >
                          <option value="blur-in">Blur In</option>
                          <option value="blur-out">Blur Out</option>
                          <option value="blur-in-out">Blur In & Out</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                      <div className="setting-group">
                        <span className="setting-label">Background</span>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={blurredBackground}
                            onChange={(e) => setBlurredBackground(e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                          <span className="toggle-label">Blurred BG</span>
                        </label>
                      </div>
                      <div className="setting-group">
                        <span className="setting-label">Overlay</span>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={vcrEffect}
                            onChange={(e) => setVcrEffect(e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                          <span className="toggle-label">VCR Effect</span>
                        </label>
                      </div>
                                          </div>
                  </div>

                  {/* Attribution Section */}
                  <div className="settings-section">
                    <h3 className="settings-section-title">Attribution</h3>
                    <div className="settings-row">
                      <div className="setting-group" style={{ flex: 1 }}>
                        <label className="setting-label" htmlFor="attribution-text">Lower Third Text</label>
                        <input
                          type="text"
                          id="attribution-text"
                          className="text-input"
                          placeholder="e.g., via @username or Source: example.com"
                          value={attributionText}
                          onChange={(e) => setAttributionText(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="settings-actions">
                    <button
                      className="btn btn-primary btn-generate"
                      onClick={handleRender}
                      disabled={selectedWords.length === 0 || isRendering}
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
                    <div className="btn-group-secondary">
                      <button
                        className="btn btn-ghost"
                        onClick={handleClearSelection}
                        disabled={selectedWords.length === 0}
                      >
                        Clear Selection
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          setFilename(null);
                          setImagePath(null);
                          setWords([]);
                          setSelectedWords([]);
                          setVideoPath(null);
                          setStatus(null);
                        }}
                      >
                        New Image
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="preview-column">
            <VideoPreview videoPath={videoPath} isRendering={isRendering} renderTime={renderTime} />
            {status && (
              <div className={`status ${status.type}`}>{status.message}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
