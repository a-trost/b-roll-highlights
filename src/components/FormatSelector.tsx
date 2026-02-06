import { Monitor, Smartphone, Square } from 'lucide-react';
import type { OutputFormat } from '../types';

interface FormatSelectorProps {
  value: OutputFormat;
  onChange: (format: OutputFormat) => void;
}

const formats: { id: OutputFormat; label: string; ratio: string; icon: typeof Monitor }[] = [
  { id: 'landscape', label: 'Desktop', ratio: '16:9', icon: Monitor },
  { id: 'portrait', label: 'Mobile', ratio: '9:16', icon: Smartphone },
  { id: 'square', label: 'Square', ratio: '1:1', icon: Square },
];

export const FormatSelector: React.FC<FormatSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="format-selector">
      {formats.map(({ id, label, ratio, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`format-card ${value === id ? 'active' : ''}`}
          onClick={() => onChange(id)}
        >
          <Icon size={18} />
          <span className="format-label">{label}</span>
          <span className="format-ratio">{ratio}</span>
        </button>
      ))}
    </div>
  );
};
