import { useEffect, useState } from 'react';
import { Rabbit } from 'lucide-react';
import './DepthMeter.css';

interface DepthMeterProps {
  articleCount: number;
}

const DEPTH_LABELS = [
  { min: 0, label: 'Surface', emoji: '🌊' },
  { min: 3, label: 'Curious', emoji: '🐇' },
  { min: 6, label: 'Exploring', emoji: '🔦' },
  { min: 10, label: 'Deep Dive', emoji: '🤿' },
  { min: 15, label: 'Rabbit Hole', emoji: '🕳️' },
  { min: 25, label: 'Wonderland', emoji: '🍄' },
  { min: 40, label: 'Scholar', emoji: '🎓' },
  { min: 60, label: 'Obsessed', emoji: '🧠' },
];

export function DepthMeter({ articleCount }: DepthMeterProps) {
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);

  const currentDepth = DEPTH_LABELS.reduce((acc, level) =>
    articleCount >= level.min ? level : acc
  , DEPTH_LABELS[0]);

  const nextDepth = DEPTH_LABELS.find(level => level.min > articleCount);
  const progress = nextDepth
    ? ((articleCount - currentDepth.min) / (nextDepth.min - currentDepth.min)) * 100
    : 100;

  useEffect(() => {
    if (articleCount > 0) {
      setVisible(true);
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 600);
      return () => clearTimeout(timer);
    }
  }, [articleCount]);

  if (!visible || articleCount === 0) return null;

  return (
    <div className={`depth-meter ${animate ? 'pulse' : ''}`}>
      <div className="depth-icon">
        <Rabbit size={16} />
      </div>
      <div className="depth-info">
        <div className="depth-label">
          <span className="depth-emoji">{currentDepth.emoji}</span>
          <span className="depth-text">{currentDepth.label}</span>
          <span className="depth-count">{articleCount}</span>
        </div>
        <div className="depth-progress">
          <div
            className="depth-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
