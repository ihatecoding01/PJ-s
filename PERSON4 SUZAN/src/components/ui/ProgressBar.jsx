import React from 'react';

export default function ProgressBar({
  value = 0,
  max = 100,
  variant = 'forest',
  showLabel = false,
  className = '',
  height = 'h-2.5'
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const variantFills = {
    forest: 'bg-forest',
    sage: 'bg-sage-light',
    coral: 'bg-coral',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-medium text-ink/70 mb-1.5 tabular-nums">
          <span>Progress</span>
          <span className="font-semibold text-ink">{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-gray/80 rounded-full overflow-hidden ${height}`}>
        <div
          className={`${variantFills[variant] || variantFills.forest} h-full rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
