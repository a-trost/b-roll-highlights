import React from 'react';
import { Play, Download } from 'lucide-react';

interface VideoPreviewProps {
  videoPath: string | null;
  downloadPath?: string | null;
  isRendering: boolean;
  renderTime: number | null;
  renderProgress: { label: string; detail: string; value: number } | null;
}

function formatRenderTime(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  videoPath,
  downloadPath,
  isRendering,
  renderTime,
  renderProgress,
}) => {
  if (isRendering && renderProgress && !videoPath) {
    return (
      <div className="video-preview">
        <h2>Preview</h2>
        <div className="render-progress-container">
          <div className="render-progress-content">
            <span className="render-progress-label">{renderProgress.detail}</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${renderProgress.value}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!videoPath) {
    return (
      <div className="video-preview">
        <h2>Preview</h2>
        <div className="placeholder">
          <div className="placeholder-icon">
            <Play size={24} strokeWidth={1.5} />
          </div>
          <p>Select words and generate to preview your video</p>
        </div>
      </div>
    );
  }

  // Use downloadPath for the download link when available (e.g. ProRes .mov)
  const downloadHref = downloadPath || videoPath;
  const downloadLabel = downloadPath ? "Download .mov" : "Download Video";
  const isProResRendering = isRendering && videoPath && !downloadPath;

  return (
    <div className="video-preview">
      <h2>Preview</h2>
      <video
        key={videoPath}
        controls
        autoPlay
        muted
        loop
        src={videoPath}
      />
      <div className="download-row">
        {isProResRendering ? (
          <span className="download-link download-link--pending">
            <Download size={14} />
            Rendering .mov...
            {renderProgress && (
              <span className="prores-progress">{renderProgress.value}%</span>
            )}
          </span>
        ) : (
          <a
            href={downloadHref}
            download
            className="download-link"
          >
            <Download size={14} />
            {downloadLabel}
            <span className="keyboard-shortcut">⌘S</span>
          </a>
        )}
        {renderTime && (
          <span className="render-time">
            Rendered in {formatRenderTime(renderTime)}
          </span>
        )}
      </div>
    </div>
  );
};
