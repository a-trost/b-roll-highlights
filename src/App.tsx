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
  DEFAULT_UNBLUR_SECONDS,
  MIN_UNBLUR_SECONDS,
  MAX_UNBLUR_SECONDS,
  getHighlightColors,
  getCircleColors,
  isDarkBackground,
} from "./types";

type Status = {
  type: "info" | "error" | "success";
  message: string;
} | null;

type ItemSettings = {
  colorIndex: number;
  markingMode: MarkingMode;
  leadInSeconds: number;
  charsPerSecond: number;
  leadOutSeconds: number;
  unblurSeconds: number;
  blurredBackground: boolean;
  cameraMovement: CameraMovement;
  blurMode: BlurMode;
  vcrEffect: boolean;
  attributionText: string;
};

type QueueItem = {
  id: string;
  sourceName: string;
  filename: string | null;
  imagePath: string | null;
  words: WordBox[];
  selectedWords: WordBox[];
  backgroundColor: [number, number, number];
  imageWidth: number;
  imageHeight: number;
  settings: ItemSettings;
  videoPath: string | null;
  renderTime: number | null;
  isPreview: boolean;
  isUploading: boolean;
  isProcessingOCR: boolean;
  isRendering: boolean;
  isRenderingPreview: boolean;
  status: Status;
};

type StoredQueueItem = {
  id: string;
  sourceName: string;
  filename: string | null;
  imagePath: string | null;
  words: WordBox[];
  selectedWords: WordBox[];
  backgroundColor: [number, number, number];
  imageWidth: number;
  imageHeight: number;
  settings: ItemSettings;
  videoPath: string | null;
  renderTime: number | null;
  isPreview: boolean;
};

const STORAGE_KEY = "broll-queue-v1";
const PREVIEW_SECONDS = 6;
const MAX_UPLOAD_CONCURRENCY = 2;
const MAX_RENDER_CONCURRENCY = 2;

const createDefaultSettings = (): ItemSettings => ({
  colorIndex: 0,
  markingMode: "highlight",
  leadInSeconds: DEFAULT_LEAD_IN_SECONDS,
  charsPerSecond: DEFAULT_CHARS_PER_SECOND,
  leadOutSeconds: DEFAULT_LEAD_OUT_SECONDS,
  unblurSeconds: DEFAULT_UNBLUR_SECONDS,
  blurredBackground: false,
  cameraMovement: "left-right",
  blurMode: "blur-in",
  vcrEffect: false,
  attributionText: "",
});

const createQueueItem = (overrides: Partial<QueueItem> & { id: string; sourceName: string }): QueueItem => ({
  id: overrides.id,
  sourceName: overrides.sourceName,
  filename: overrides.filename ?? null,
  imagePath: overrides.imagePath ?? null,
  words: overrides.words ?? [],
  selectedWords: overrides.selectedWords ?? [],
  backgroundColor: overrides.backgroundColor ?? [255, 255, 255],
  imageWidth: overrides.imageWidth ?? 1920,
  imageHeight: overrides.imageHeight ?? 1080,
  settings: { ...createDefaultSettings(), ...overrides.settings },
  videoPath: overrides.videoPath ?? null,
  renderTime: overrides.renderTime ?? null,
  isPreview: overrides.isPreview ?? false,
  isUploading: overrides.isUploading ?? false,
  isProcessingOCR: overrides.isProcessingOCR ?? false,
  isRendering: overrides.isRendering ?? false,
  isRenderingPreview: overrides.isRenderingPreview ?? false,
  status: overrides.status ?? null,
});

const serializeQueue = (queue: QueueItem[]): StoredQueueItem[] =>
  queue.map((item) => ({
    id: item.id,
    sourceName: item.sourceName,
    filename: item.filename,
    imagePath: item.imagePath,
    words: item.words,
    selectedWords: item.selectedWords,
    backgroundColor: item.backgroundColor,
    imageWidth: item.imageWidth,
    imageHeight: item.imageHeight,
    settings: item.settings,
    videoPath: item.videoPath,
    renderTime: item.renderTime,
    isPreview: item.isPreview,
  }));

const hydrateQueue = (stored: StoredQueueItem[]): QueueItem[] =>
  stored.map((item) =>
    createQueueItem({
      ...item,
      id: item.id,
      sourceName: item.sourceName,
      isUploading: false,
      isProcessingOCR: false,
      isRendering: false,
      isRenderingPreview: false,
      status: null,
    })
  );

const loadQueue = (): QueueItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredQueueItem[];
    if (!Array.isArray(parsed)) return [];
    return hydrateQueue(parsed);
  } catch {
    return [];
  }
};

const runWithConcurrency = async <T,>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> => {
  if (items.length === 0) return;
  let index = 0;
  const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      await worker(items[currentIndex]);
    }
  });
  await Promise.all(runners);
};

function App() {
  const [queue, setQueue] = useState<QueueItem[]>(() => loadQueue());
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const queueRef = useRef(queue);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeQueue(queue)));
  }, [queue]);

  useEffect(() => {
    if (activeItemId && queue.some((item) => item.id === activeItemId)) return;
    setActiveItemId(queue[0]?.id ?? null);
  }, [queue, activeItemId]);

  const isAnyRendering = queue.some((item) => item.isRendering);
  const hasAnyVideo = queue.some((item) => item.videoPath);
  const hasRenderableItems = queue.some(
    (item) => item.filename && item.selectedWords.length > 0
  );

  useFavicon(isAnyRendering, hasAnyVideo);

  const updateItem = useCallback(
    (id: string, updater: (item: QueueItem) => QueueItem) => {
      setQueue((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
    },
    []
  );

  const handleUpload = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) return;

      const entries = imageFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
      }));

      setQueue((prev) => [
        ...prev,
        ...entries.map(({ id, file }) =>
          createQueueItem({
            id,
            sourceName: file.name,
            isUploading: true,
            status: { type: "info", message: "Uploading image..." },
          })
        ),
      ]);

      await runWithConcurrency(entries, MAX_UPLOAD_CONCURRENCY, async ({ id, file }) => {
        updateItem(id, (item) => ({
          ...item,
          isUploading: true,
          status: { type: "info", message: "Uploading image..." },
        }));

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

          updateItem(id, (item) => ({
            ...item,
            filename: uploadData.filename,
            imagePath: uploadData.path,
            selectedWords: [],
            videoPath: null,
            renderTime: null,
            isPreview: false,
            isUploading: false,
            isProcessingOCR: true,
            status: { type: "info", message: "Processing image with OCR..." },
          }));

          const ocrRes = await fetch("/api/ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: uploadData.filename }),
          });

          if (!ocrRes.ok) {
            throw new Error("OCR processing failed");
          }

          const ocrData: OCRResult = await ocrRes.json();

          updateItem(id, (item) => ({
            ...item,
            words: ocrData.words,
            backgroundColor: ocrData.backgroundColor,
            imageWidth: ocrData.imageWidth,
            imageHeight: ocrData.imageHeight,
            isProcessingOCR: false,
            status: {
              type: "success",
              message: `Found ${ocrData.words.length} words. ${isDarkBackground(ocrData.backgroundColor) ? "Dark" : "Light"} image detected.`,
            },
          }));
        } catch (error) {
          updateItem(id, (item) => ({
            ...item,
            isUploading: false,
            isProcessingOCR: false,
            status: {
              type: "error",
              message: error instanceof Error ? error.message : "Upload failed",
            },
          }));
        }
      });
    },
    [updateItem]
  );

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

  const getItemColors = useCallback((item: QueueItem) => {
    const availableColors =
      item.settings.markingMode === "highlight" || item.settings.markingMode === "unblur"
        ? getHighlightColors(item.backgroundColor)
        : getCircleColors(item.backgroundColor);
    const colorIndex = Math.min(item.settings.colorIndex, availableColors.length - 1);
    const selectedColor = availableColors[colorIndex]?.value ?? availableColors[0].value;
    return { availableColors, colorIndex, selectedColor };
  }, []);

  const renderItem = useCallback(
    async (itemId: string, previewSeconds?: number) => {
      const item = queueRef.current.find((entry) => entry.id === itemId);
      if (!item || !item.filename || item.selectedWords.length === 0) return;

      const { selectedColor } = getItemColors(item);

      updateItem(itemId, (current) => ({
        ...current,
        isRendering: true,
        isRenderingPreview: Boolean(previewSeconds),
        renderTime: null,
        status: {
          type: "info",
          message: previewSeconds
            ? "Rendering preview... This may take a moment."
            : "Rendering video... This may take a moment.",
        },
      }));

      const startTime = Date.now();
      try {
        const res = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: item.filename,
            selectedWords: item.selectedWords,
            backgroundColor: item.backgroundColor,
            imageWidth: item.imageWidth,
            imageHeight: item.imageHeight,
            highlightColor: selectedColor,
            markingMode: item.settings.markingMode,
            leadInSeconds: item.settings.leadInSeconds,
            charsPerSecond: item.settings.charsPerSecond,
            leadOutSeconds: item.settings.leadOutSeconds,
            blurredBackground: item.settings.blurredBackground,
            cameraMovement: item.settings.cameraMovement,
            blurMode: item.settings.blurMode,
            vcrEffect: item.settings.vcrEffect,
            unblurSeconds: item.settings.unblurSeconds,
            attributionText: item.settings.attributionText,
            previewSeconds: previewSeconds ?? 0,
          }),
        });

        if (!res.ok) {
          throw new Error("Render failed");
        }

        const data: RenderResponse = await res.json();
        updateItem(itemId, (current) => ({
          ...current,
          videoPath: data.videoPath,
          renderTime: Date.now() - startTime,
          isPreview: Boolean(previewSeconds),
          status: {
            type: "success",
            message: previewSeconds
              ? "Preview rendered successfully!"
              : "Video rendered successfully!",
          },
        }));
      } catch (error) {
        updateItem(itemId, (current) => ({
          ...current,
          status: {
            type: "error",
            message: error instanceof Error ? error.message : "Render failed",
          },
        }));
      } finally {
        updateItem(itemId, (current) => ({
          ...current,
          isRendering: false,
          isRenderingPreview: false,
        }));
      }
    },
    [getItemColors, updateItem]
  );

  const renderAll = useCallback(
    async (previewSeconds?: number) => {
      const itemsToRender = queueRef.current.filter(
        (item) => item.filename && item.selectedWords.length > 0 && !item.isRendering
      );
      await runWithConcurrency(itemsToRender, MAX_RENDER_CONCURRENCY, async (item) => {
        await renderItem(item.id, previewSeconds);
      });
    },
    [renderItem]
  );

  const removeItem = useCallback(
    (id: string) => {
      setQueue((prev) => prev.filter((item) => item.id !== id));
      setActiveItemId((prev) => (prev === id ? null : prev));
    },
    []
  );

  const clearQueue = useCallback(() => {
    setQueue([]);
    setActiveItemId(null);
  }, []);

  const updateItemSettings = useCallback(
    (id: string, partial: Partial<ItemSettings>) => {
      updateItem(id, (item) => ({
        ...item,
        settings: {
          ...item.settings,
          ...partial,
        },
      }));
    },
    [updateItem]
  );

  const getProgressState = useCallback((item: QueueItem) => {
    if (item.isUploading) {
      return { label: "Uploading", detail: "Uploading image", value: 20 };
    }
    if (item.isProcessingOCR) {
      return { label: "OCR", detail: "Processing text", value: 45 };
    }
    if (item.isRendering) {
      return {
        label: item.isRenderingPreview ? "Preview" : "Rendering",
        detail: item.isRenderingPreview ? "Rendering preview" : "Rendering video",
        value: 80,
      };
    }
    return null;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (activeItemId) {
          const item = queueRef.current.find((entry) => entry.id === activeItemId);
          if (item && item.selectedWords.length > 0 && !item.isRendering) {
            e.preventDefault();
            renderItem(activeItemId);
          }
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        const item = queueRef.current.find((entry) => entry.id === activeItemId);
        if (item?.videoPath) {
          e.preventDefault();
          const link = document.createElement("a");
          link.href = item.videoPath;
          link.download = "";
          link.click();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeItemId, renderItem]);

  const isUploadingAny = queue.some((item) => item.isUploading);

  return (
    <div className="app">
      <h1>B-Roll Highlights</h1>
      <ImageUploader onUpload={handleUpload} isUploading={isUploadingAny} />

      {queue.length > 0 && (
        <div className="queue-toolbar">
          <button
            className="btn btn-primary"
            onClick={() => renderAll()}
            disabled={!hasRenderableItems}
          >
            Render All
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => renderAll(PREVIEW_SECONDS)}
            disabled={!hasRenderableItems}
          >
            Render All Previews ({PREVIEW_SECONDS}s)
          </button>
          <button className="btn btn-ghost" onClick={clearQueue}>
            Clear Queue
          </button>
        </div>
      )}

      {queue.length === 0 ? (
        <div className="empty-state">Upload images to start building your queue.</div>
      ) : (
        <div className="queue-grid">
          {queue.map((item, index) => {
            const { availableColors, colorIndex, selectedColor } = getItemColors(item);
            const progressState = getProgressState(item);

            return (
              <div
                key={item.id}
                className={`queue-card${activeItemId === item.id ? " active" : ""}`}
                onClick={() => setActiveItemId(item.id)}
              >
                <div className="queue-card-header">
                  <div>
                    <h2 className="queue-card-title">
                      {item.sourceName || `Image ${index + 1}`}
                    </h2>
                    <div className="queue-card-meta">
                      {item.words.length} words · {item.selectedWords.length} selected
                    </div>
                  </div>
                  <div className="queue-card-actions">
                    <button
                      className="btn-ghost"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.id);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {progressState && (
                  <div className="progress-panel">
                    <div className="progress-panel-header">
                      <span className="progress-panel-label">{progressState.label}</span>
                      <span className="progress-panel-value">{progressState.detail}</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${progressState.value}%` }}
                      />
                    </div>
                  </div>
                )}

                {item.isUploading || item.isProcessingOCR ? (
                  <div className="loading">
                    <div className="spinner" />
                    <span>
                      {item.isUploading
                        ? "Uploading image..."
                        : "Processing image with OCR..."}
                    </span>
                  </div>
                ) : item.imagePath ? (
                  <WordSelector
                    imageSrc={item.imagePath}
                    words={item.words}
                    selectedWords={item.selectedWords}
                    onSelectionChange={(words) =>
                      updateItem(item.id, (current) => ({
                        ...current,
                        selectedWords: words,
                      }))
                    }
                    imageWidth={item.imageWidth}
                    imageHeight={item.imageHeight}
                    markingMode={item.settings.markingMode}
                    highlightColor={selectedColor}
                  />
                ) : null}

                <div className="settings-panel">
                  <div className="settings-section">
                    <h3 className="settings-section-title">Style</h3>
                    <div className="settings-row">
                      <div className="setting-group">
                        <span className="setting-label">Mode</span>
                        <div className="mode-toggle">
                          <button
                            className={`mode-btn ${
                              item.settings.markingMode === "highlight" ? "active" : ""
                            }`}
                            onClick={() =>
                              updateItemSettings(item.id, {
                                markingMode: "highlight",
                                colorIndex: 0,
                              })
                            }
                          >
                            <span className="mode-icon">◼</span>
                            Highlight
                          </button>
                          <button
                            className={`mode-btn ${
                              item.settings.markingMode === "circle" ? "active" : ""
                            }`}
                            onClick={() =>
                              updateItemSettings(item.id, {
                                markingMode: "circle",
                                colorIndex: 0,
                              })
                            }
                          >
                            <span className="mode-icon">○</span>
                            Circle
                          </button>
                          <button
                            className={`mode-btn ${
                              item.settings.markingMode === "underline" ? "active" : ""
                            }`}
                            onClick={() =>
                              updateItemSettings(item.id, {
                                markingMode: "underline",
                                colorIndex: 0,
                              })
                            }
                          >
                            <span className="mode-icon">_</span>
                            Underline
                          </button>
                          <button
                            className={`mode-btn ${
                              item.settings.markingMode === "unblur" ? "active" : ""
                            }`}
                            onClick={() =>
                              updateItemSettings(item.id, {
                                markingMode: "unblur",
                                colorIndex: 0,
                              })
                            }
                          >
                            <span className="mode-icon">◧</span>
                            Unblur
                          </button>
                        </div>
                      </div>
                      <div className="setting-group">
                        <label className="setting-label" htmlFor={`color-select-${item.id}`}>
                          {item.settings.markingMode === "highlight" ||
                          item.settings.markingMode === "unblur"
                            ? "Highlight"
                            : "Pen"}{" "}
                          Color
                        </label>
                        <div className="color-select-wrapper">
                          <span
                            className="color-preview"
                            style={{ backgroundColor: selectedColor }}
                          />
                          <select
                            id={`color-select-${item.id}`}
                            value={colorIndex}
                            onChange={(e) =>
                              updateItemSettings(item.id, {
                                colorIndex: parseInt(e.target.value, 10),
                              })
                            }
                          >
                            {availableColors.map((color, indexValue) => (
                              <option key={color.name} value={indexValue}>
                                {color.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="settings-section">
                    <h3 className="settings-section-title">Timing</h3>
                    <div className="settings-grid">
                      <div className="slider-control">
                        <div className="slider-header">
                          <span className="slider-label">Lead In</span>
                          <span className="slider-value">
                            {item.settings.leadInSeconds}s
                          </span>
                        </div>
                        <input
                          type="range"
                          id={`lead-in-${item.id}`}
                          min={MIN_LEAD_SECONDS}
                          max={MAX_LEAD_SECONDS}
                          step={0.5}
                          value={item.settings.leadInSeconds}
                          onChange={(e) =>
                            updateItemSettings(item.id, {
                              leadInSeconds: parseFloat(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="slider-control">
                        <div className="slider-header">
                          <span className="slider-label">Speed</span>
                          <span className="slider-value">
                            {item.settings.charsPerSecond} chr/s
                          </span>
                        </div>
                        <input
                          type="range"
                          id={`chars-per-second-${item.id}`}
                          min={MIN_CHARS_PER_SECOND}
                          max={MAX_CHARS_PER_SECOND}
                          step={1}
                          value={item.settings.charsPerSecond}
                          onChange={(e) =>
                            updateItemSettings(item.id, {
                              charsPerSecond: parseInt(e.target.value, 10),
                            })
                          }
                        />
                      </div>
                      <div className="slider-control">
                        <div className="slider-header">
                          <span className="slider-label">Lead Out</span>
                          <span className="slider-value">
                            {item.settings.leadOutSeconds}s
                          </span>
                        </div>
                        <input
                          type="range"
                          id={`lead-out-${item.id}`}
                          min={MIN_LEAD_SECONDS}
                          max={MAX_LEAD_SECONDS}
                          step={0.5}
                          value={item.settings.leadOutSeconds}
                          onChange={(e) =>
                            updateItemSettings(item.id, {
                              leadOutSeconds: parseFloat(e.target.value),
                            })
                          }
                        />
                      </div>
                      {item.settings.markingMode === "unblur" && (
                        <div className="slider-control">
                          <div className="slider-header">
                            <span className="slider-label">Unblur</span>
                            <span className="slider-value">
                              {item.settings.unblurSeconds}s
                            </span>
                          </div>
                          <input
                            type="range"
                            id={`unblur-duration-${item.id}`}
                            min={MIN_UNBLUR_SECONDS}
                            max={MAX_UNBLUR_SECONDS}
                            step={0.1}
                            value={item.settings.unblurSeconds}
                            onChange={(e) =>
                              updateItemSettings(item.id, {
                                unblurSeconds: parseFloat(e.target.value),
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="settings-section">
                    <h3 className="settings-section-title">Effects</h3>
                    <div className="settings-row">
                      <div className="setting-group">
                        <label className="setting-label" htmlFor={`camera-${item.id}`}>
                          Camera
                        </label>
                        <select
                          id={`camera-${item.id}`}
                          className="select-input"
                          value={item.settings.cameraMovement}
                          onChange={(e) =>
                            updateItemSettings(item.id, {
                              cameraMovement: e.target.value as CameraMovement,
                            })
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
                        <label className="setting-label" htmlFor={`blur-mode-${item.id}`}>
                          Blur
                        </label>
                        <select
                          id={`blur-mode-${item.id}`}
                          className="select-input"
                          value={item.settings.blurMode}
                          onChange={(e) =>
                            updateItemSettings(item.id, {
                              blurMode: e.target.value as BlurMode,
                            })
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
                            checked={item.settings.blurredBackground}
                            onChange={(e) =>
                              updateItemSettings(item.id, {
                                blurredBackground: e.target.checked,
                              })
                            }
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
                            checked={item.settings.vcrEffect}
                            onChange={(e) =>
                              updateItemSettings(item.id, {
                                vcrEffect: e.target.checked,
                              })
                            }
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
                        <label className="setting-label" htmlFor={`attribution-${item.id}`}>
                          Lower Third Text
                        </label>
                        <input
                          type="text"
                          id={`attribution-${item.id}`}
                          className="text-input"
                          placeholder="e.g., via @username or Source: example.com"
                          value={item.settings.attributionText}
                          onChange={(e) =>
                            updateItemSettings(item.id, {
                              attributionText: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="settings-actions">
                    <button
                      className="btn btn-primary btn-generate"
                      onClick={(e) => {
                        e.stopPropagation();
                        renderItem(item.id);
                      }}
                      disabled={item.selectedWords.length === 0 || item.isRendering}
                    >
                      {item.isRendering ? (
                        <>
                          <span className="btn-spinner"></span>
                          Rendering...
                        </>
                      ) : (
                        <>Generate Video</>
                      )}
                    </button>
                    <div className="btn-group-secondary">
                      <button
                        className="btn btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          renderItem(item.id, PREVIEW_SECONDS);
                        }}
                        disabled={item.selectedWords.length === 0 || item.isRendering}
                      >
                        Render Preview ({PREVIEW_SECONDS}s)
                      </button>
                    </div>
                  </div>
                </div>

                <VideoPreview
                  videoPath={item.videoPath}
                  isRendering={item.isRendering}
                  renderTime={item.renderTime}
                  isPreview={item.isPreview}
                />

                {item.status && (
                  <div className={`status ${item.status.type}`}>{item.status.message}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default App;
