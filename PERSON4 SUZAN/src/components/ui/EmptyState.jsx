import React from 'react';
import { FolderOpen } from 'lucide-react';
import Button from './Button.jsx';

export default function EmptyState({
  icon: Icon = FolderOpen,
  title = 'No items found',
  description = 'There are currently no records to display.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white border border-dashed border-gray rounded-card ${className}`}>
      <div className="w-12 h-12 rounded-full bg-sage flex items-center justify-center mb-4 text-forest">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-ink mb-1.5">{title}</h3>
      <p className="text-sm text-ink/60 max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
