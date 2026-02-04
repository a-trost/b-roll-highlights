import React from 'react';

interface VideoPreviewProps {
  videoPath: string | null;
  isRendering: boolean;
  renderTime: number | null;
  isPreview: boolean;
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
  isRendering,
  renderTime,
  isPreview,
}) => {
  if (isRendering) {
    return (
      <div className="video-preview">
        <h2>Video Preview</h2>
        <div className="loading">
          <div className="spinner" />
          <span>Rendering video... This may take a moment.</span>
        </div>
      </div>
    );
  }

  if (!videoPath) {
    return (
      <div className="video-preview">
        <h2>Video Preview</h2>
        <div className="placeholder">
          <div className="placeholder-icon">🎬</div>
          <p>Select words and click "Generate Video" to create your highlight video</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-preview">
      <h2>
        Video Preview
        {isPreview && <span className="preview-badge">Preview</span>}
      </h2>
      <video
        key={videoPath}
        controls
        autoPlay
        loop
        src={videoPath}
      />
      <div className="download-row">
        <a
          href={videoPath}
          download
          className="download-link"
        >
          Download Video
          <span className="keyboard-shortcut">⌘S</span>
        </a>
        {renderTime && (
          <span className="render-time">
            Rendered in {formatRenderTime(renderTime)}
          </span>
        )}
      </div>
    </div>
  );
};
