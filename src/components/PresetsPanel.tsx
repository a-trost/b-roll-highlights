import { useState, useRef, useEffect } from "react";
import { MoreVertical, Check, Save, Pencil, Trash2 } from "lucide-react";
import type { Preset } from "../App";

interface PresetsPanelProps {
  presets: Preset[];
  onSave: (name: string) => void;
  onLoad: (preset: Preset) => void;
  onOverwrite: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

export function PresetsPanel({ presets, onSave, onLoad, onOverwrite, onRename, onDelete }: PresetsPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCreating) createInputRef.current?.focus();
  }, [isCreating]);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  useEffect(() => {
    if (!menuOpenId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpenId]);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setNewName("");
    setIsCreating(false);
  };

  const handleRenameSubmit = (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) onRename(id, trimmed);
    setRenamingId(null);
  };

  return (
    <div className="settings-section presets-panel">
      <div className="presets-header">
        <h3 className="settings-section-title">Presets</h3>
        {!isCreating && (
          <button className="btn-ghost presets-save-btn" onClick={() => setIsCreating(true)}>
            Save Current
          </button>
        )}
      </div>

      {isCreating && (
        <div className="presets-create-row">
          <input
            ref={createInputRef}
            type="text"
            className="text-input presets-name-input"
            placeholder="Preset name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewName("");
              }
            }}
          />
          <button className="btn btn-primary presets-action-btn" onClick={handleCreate}>
            Save
          </button>
          <button
            className="btn-ghost presets-action-btn"
            onClick={() => {
              setIsCreating(false);
              setNewName("");
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {presets.length === 0 ? (
        <div className="presets-empty">No saved presets</div>
      ) : (
        <div className="presets-list">
          {presets.map((preset) => (
            <div key={preset.id} className="preset-row">
              {renamingId === preset.id ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  className="text-input presets-name-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit(preset.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onBlur={() => handleRenameSubmit(preset.id)}
                />
              ) : (
                <span className="preset-name" onClick={() => onLoad(preset)}>{preset.name}</span>
              )}
              <div className="preset-actions">
                <button className="preset-apply-btn" onClick={() => onLoad(preset)}>
                  <Check size={12} />
                  Apply
                </button>
                <div className="preset-menu-wrapper" ref={menuOpenId === preset.id ? menuRef : undefined}>
                  <button
                    className="preset-menu-trigger"
                    onClick={() => setMenuOpenId(menuOpenId === preset.id ? null : preset.id)}
                  >
                    <MoreVertical size={14} />
                  </button>
                  {menuOpenId === preset.id && (
                    <div className="preset-menu">
                      <button
                        className="preset-menu-item"
                        onClick={() => {
                          if (window.confirm(`Update "${preset.name}" with current settings?`)) {
                            onOverwrite(preset.id);
                          }
                          setMenuOpenId(null);
                        }}
                      >
                        <Save size={12} />
                        Update
                      </button>
                      <button
                        className="preset-menu-item"
                        onClick={() => {
                          setRenamingId(preset.id);
                          setRenameValue(preset.name);
                          setMenuOpenId(null);
                        }}
                      >
                        <Pencil size={12} />
                        Rename
                      </button>
                      <button
                        className="preset-menu-item preset-menu-item-danger"
                        onClick={() => {
                          if (window.confirm(`Delete "${preset.name}"?`)) {
                            onDelete(preset.id);
                          }
                          setMenuOpenId(null);
                        }}
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
