import React from 'react';

interface VideoPreviewProps {
  videoPath: string | null;
  isRendering: boolean;
  renderTime: number | null;
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
}) => {
  if (isRendering) {
    return (
      <div className="video-preview">
        <h2>Preview</h2>
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
        <h2>Preview</h2>
        <div className="placeholder">
          <div className="placeholder-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
          <p>Select words and generate to preview your video</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-preview">
      <h2>Preview</h2>
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
