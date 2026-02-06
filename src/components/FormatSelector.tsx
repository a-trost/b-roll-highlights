import { Monitor, Smartphone, Square } from 'lucide-react';
import type { OutputFormat } from '../types';

interface FormatSelectorProps {
  value: OutputFormat;
  onChange: (format: OutputFormat) => void;
  frameRate: 24 | 30 | 60;
  onFrameRateChange: (fps: 24 | 30 | 60) => void;
}

const formats: { id: OutputFormat; label: string; ratio: string; icon: typeof Monitor }[] = [
  { id: 'landscape', label: 'Desktop', ratio: '16:9', icon: Monitor },
  { id: 'portrait', label: 'Mobile', ratio: '9:16', icon: Smartphone },
  { id: 'square', label: 'Square', ratio: '1:1', icon: Square },
];

const frameRates: (24 | 30 | 60)[] = [24, 30, 60];

export const FormatSelector: React.FC<FormatSelectorProps> = ({
  value,
  onChange,
  frameRate,
  onFrameRateChange,
}) => {
  return (
    <div className="format-selector-container">
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
      <div className="format-selector">
        {frameRates.map((fps) => (
          <button
            key={fps}
            type="button"
            className={`format-card format-card-fps ${frameRate === fps ? 'active' : ''}`}
            onClick={() => onFrameRateChange(fps)}
          >
            <span className="format-label">{fps} fps</span>
          </button>
        ))}
      </div>
    </div>
  );
};
