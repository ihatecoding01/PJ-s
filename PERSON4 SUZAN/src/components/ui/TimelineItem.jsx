import React from 'react';
import { ExternalLink, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Badge from './Badge.jsx';

export default function TimelineItem({
  timestamp,
  actor,
  role,
  title,
  description,
  txHash,
  status = 'completed',
  isLast = false,
  onVerify,
}) {
  const explorerUrl = import.meta.env.VITE_EXPLORER_URL || 'https://amoy.polygonscan.com';

  const dateStr = timestamp
    ? new Date(typeof timestamp === 'number' && timestamp < 1e12 ? timestamp * 1000 : timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  return (
    <div className="relative flex gap-4">
      {/* Vertical connector line */}
      {!isLast && (
        <span
          className="absolute left-[15px] top-[28px] bottom-0 w-[2px] bg-gray"
          aria-hidden="true"
        />
      )}

      {/* Status indicator dot */}
      <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-sage border-2 border-forest text-forest shrink-0 mt-0.5">
        {status === 'completed' ? (
          <CheckCircle2 className="w-4 h-4 text-forest" />
        ) : status === 'disputed' ? (
          <AlertCircle className="w-4 h-4 text-coral" />
        ) : (
          <Clock className="w-4 h-4 text-forest" />
        )}
      </div>

      {/* Content card */}
      <div className="flex-1 pb-6 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <h4 className="font-heading font-semibold text-sm text-ink">{title}</h4>
            {role && <Badge size="sm" variant="sage">{role}</Badge>}
          </div>
          {dateStr && <span className="text-xs text-ink/50 tabular-nums">{dateStr}</span>}
        </div>

        {description && (
          <p className="text-xs text-ink/70 leading-relaxed mb-2 break-words">{description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {actor && (
            <span className="text-ink/60 font-mono text-[11px]">
              By: {actor.slice(0, 6)}...{actor.slice(-4)}
            </span>
          )}

          {txHash && (
            <a
              href={`${explorerUrl}/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-forest font-mono underline hover:text-forest/80"
            >
              Tx: {txHash.slice(0, 8)}...
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {onVerify && (
            <button
              onClick={onVerify}
              className="text-xs text-forest font-semibold hover:underline bg-sage-light/50 px-2 py-0.5 rounded-[4px]"
            >
              Verify on-chain
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
