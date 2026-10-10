import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { shortenAddress } from '../../lib/formatters.js';

export default function AddressBadge({
  address: rawAddress,
  label,
  chars = 4,
  showExplorer = true,
  className = ''
}) {
  const [copied, setCopied] = useState(false);
  const explorerUrl = import.meta.env.VITE_EXPLORER_URL || 'https://amoy.polygonscan.com';

  const address = typeof rawAddress === 'object' && rawAddress !== null
    ? (rawAddress.walletAddress || '')
    : (rawAddress || '');

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!address) return <span className="text-slate-500 font-mono text-xs">N/A</span>;

  return (
    <div className={`inline-flex items-center gap-1.5 bg-surface-800/80 hover:bg-surface-750 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs transition-colors ${className}`}>
      {label && <span className="text-slate-400 font-medium mr-1">{label}:</span>}
      <span className="font-mono text-slate-200">{shortenAddress(address, chars)}</span>
      
      <button
        type="button"
        onClick={handleCopy}
        title="Copy address"
        className="p-1 hover:text-teal-400 text-slate-400 transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>

      {showExplorer && (
        <a
          href={`${explorerUrl}/address/${address}`}
          target="_blank"
          rel="noreferrer"
          title="View on Block Explorer"
          className="p-1 hover:text-indigo-400 text-slate-400 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}
