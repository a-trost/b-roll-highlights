import { useState, useEffect } from "react";
import { X } from "lucide-react";

type ImageEntry = {
  filename: string;
  path: string;
  modifiedAt: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (filename: string) => void;
};

export function ImageBrowser({ open, onClose, onSelect }: Props) {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/images")
      .then((res) => res.json())
      .then((data: ImageEntry[]) => {
        setImages(data);
      })
      .catch(() => {
        setImages([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSelect = (filename: string) => {
    onSelect(filename);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-dialog image-browser-dialog">
        <div className="modal-header">
          <h2>Previous Uploads</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">
              <div className="spinner" />
              <span>Loading images...</span>
            </div>
          ) : images.length === 0 ? (
            <div className="image-browser-empty">No images found</div>
          ) : (
            <div className="image-browser-grid">
              {images.map((img) => (
                <button
                  key={img.filename}
                  className="image-browser-item"
                  onClick={() => handleSelect(img.filename)}
                >
                  <img src={img.path} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
