import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, ExternalLink, X, Loader2 } from 'lucide-react';

export default function Toast({
  type = 'info',
  title,
  message,
  txHash,
  onClose,
}) {
  const explorerUrl = import.meta.env.VITE_EXPLORER_URL || 'https://amoy.polygonscan.com';

  let borderStyle = 'border-2 border-ink bg-white text-ink shadow-brutal-sm';
  let icon = <Info className="w-5 h-5 text-forest shrink-0" />;

  if (type === 'success') {
    borderStyle = 'border border-forest/30 bg-sage-light text-forest shadow-brutal-sm';
    icon = <CheckCircle2 className="w-5 h-5 text-forest shrink-0" />;
  } else if (type === 'error') {
    borderStyle = 'border border-coral bg-coral/25 text-ink shadow-brutal-sm';
    icon = <AlertCircle className="w-5 h-5 text-coral shrink-0" />;
  } else if (type === 'warning') {
    borderStyle = 'border border-amber-300 bg-amber-50 text-amber-900 shadow-brutal-sm';
    icon = <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />;
  } else if (type === 'pending') {
    borderStyle = 'border-2 border-forest bg-white text-forest shadow-brutal-sm';
    icon = <Loader2 className="w-5 h-5 text-forest animate-spin shrink-0" />;
  }

  return (
    <div className={`pointer-events-auto flex items-start gap-3 p-4 rounded-card transition-all duration-200 animate-slide-in ${borderStyle}`}>
      {icon}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold font-heading text-ink">{title}</h4>
        {message && <p className="text-xs text-ink/80 mt-0.5 leading-relaxed break-words">{message}</p>}
        {txHash && (
          <a
            href={`${explorerUrl}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-forest font-mono underline hover:text-forest/80 mt-1.5"
          >
            Tx: {txHash.slice(0, 10)}...{txHash.slice(-6)}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-ink/60 hover:text-ink transition-colors p-1"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
