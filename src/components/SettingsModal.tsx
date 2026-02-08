import { useState, useEffect, useCallback } from "react";
import { X, FolderOpen, ChevronRight, ArrowUp } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

type AppSettings = {
  outputDir: string;
};

type BrowseResult = {
  current: string;
  parent: string | null;
  entries: { name: string; path: string }[];
};

export function SettingsModal({ open, onClose }: Props) {
  const [outputDir, setOutputDir] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Browse state
  const [browsing, setBrowsing] = useState(false);
  const [browseData, setBrowseData] = useState<BrowseResult | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setLoaded(false);
      setError(null);
      setBrowsing(false);
      setBrowseData(null);
      return;
    }

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data: AppSettings) => {
        setOutputDir(data.outputDir);
        setLoaded(true);
      })
      .catch(() => {
        setOutputDir("");
        setLoaded(true);
      });
  }, [open]);

  const browse = useCallback(async (dirPath?: string) => {
    setBrowseLoading(true);
    try {
      const params = dirPath ? `?path=${encodeURIComponent(dirPath)}` : "";
      const res = await fetch(`/api/browse${params}`);
      const data: BrowseResult = await res.json();
      setBrowseData(data);
    } catch {
      // keep existing data on error
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  const handleOpenBrowse = useCallback(() => {
    setBrowsing(true);
    browse(outputDir || undefined);
  }, [browse, outputDir]);

  const handleSelectDir = useCallback(() => {
    if (browseData) {
      setOutputDir(browseData.current);
      setError(null);
    }
    setBrowsing(false);
  }, [browseData]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputDir: outputDir.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save settings");
        return;
      }
      onClose();
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setOutputDir("");
    setError(null);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (browsing) {
        setBrowsing(false);
      } else {
        onClose();
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-dialog">
        <div className="modal-header">
          <h2>{browsing ? "Choose Directory" : "Settings"}</h2>
          <button
            className="modal-close"
            onClick={browsing ? () => setBrowsing(false) : onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {browsing ? (
            <div className="dir-browser">
              {browseData && (
                <>
                  <div className="dir-browser-path">
                    {browseData.parent && (
                      <button
                        className="dir-browser-up"
                        onClick={() => browse(browseData.parent!)}
                        disabled={browseLoading}
                        title="Go to parent directory"
                      >
                        <ArrowUp size={14} />
                      </button>
                    )}
                    <span className="dir-browser-current">{browseData.current}</span>
                  </div>
                  <div className="dir-browser-list">
                    {browseData.entries.length === 0 ? (
                      <div className="dir-browser-empty">No subdirectories</div>
                    ) : (
                      browseData.entries.map((entry) => (
                        <button
                          key={entry.path}
                          className="dir-browser-item"
                          onClick={() => browse(entry.path)}
                          disabled={browseLoading}
                        >
                          <FolderOpen size={14} />
                          <span>{entry.name}</span>
                          <ChevronRight size={12} className="dir-browser-chevron" />
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
              {browseLoading && !browseData && (
                <div className="modal-loading">
                  <div className="spinner" />
                  <span>Loading...</span>
                </div>
              )}
            </div>
          ) : !loaded ? (
            <div className="modal-loading">
              <div className="spinner" />
              <span>Loading settings...</span>
            </div>
          ) : (
            <div className="setting-group">
              <label className="setting-label" htmlFor="output-dir-input">
                Output Directory
              </label>
              <p className="setting-description">
                Path where rendered videos are saved. Leave empty to use the
                default project <code>output/</code> folder.
              </p>
              <div className="modal-input-row">
                <input
                  type="text"
                  id="output-dir-input"
                  className="text-input"
                  placeholder="/Users/you/Videos/highlights"
                  value={outputDir}
                  onChange={(e) => {
                    setOutputDir(e.target.value);
                    setError(null);
                  }}
                />
                <button className="btn-ghost" onClick={handleOpenBrowse}>
                  Browse
                </button>
                <button
                  className="btn-ghost"
                  onClick={handleReset}
                  disabled={!outputDir}
                >
                  Reset
                </button>
              </div>
              {error && <p className="modal-error">{error}</p>}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {browsing ? (
            <>
              <button className="btn-ghost" onClick={() => setBrowsing(false)}>
                Back
              </button>
              <button className="btn btn-primary" onClick={handleSelectDir}>
                Select This Directory
              </button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !loaded}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
