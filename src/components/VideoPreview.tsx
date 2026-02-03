import React from 'react';

interface VideoPreviewProps {
  videoPath: string | null;
  isRendering: boolean;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  videoPath,
  isRendering,
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
      <h2>Video Preview</h2>
      <video
        key={videoPath}
        controls
        autoPlay
        loop
        src={videoPath}
      />
      <a
        href={videoPath}
        download
        className="download-link"
      >
        Download Video
      </a>
    </div>
  );
};
