import React, { useCallback, useState, useRef } from 'react';

interface ImageUploaderProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUpload,
  isUploading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  return (
    <div
      className={`uploader ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      {isUploading ? (
        <div className="loading">
          <div className="spinner" />
          <span>Uploading...</span>
        </div>
      ) : (
        <>
          <div className="upload-icon">📷</div>
          <p>Drag and drop an image here</p>
          <p>paste from clipboard (Ctrl/Cmd+V)</p>
          <p>or click to select a file</p>
        </>
      )}
    </div>
  );
};
