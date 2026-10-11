import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

export default function AddressChip({
  address,
  label,
  showExplorer = true,
  className = '',
}) {
  const [copied, setCopied] = useState(false);
  const explorerUrl = import.meta.env.VITE_EXPLORER_URL || 'https://amoy.polygonscan.com';

  if (!address) return null;

  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-sage/60 border border-gray rounded-[8px] text-xs font-mono text-ink ${className}`}>
      {label && <span className="font-heading font-semibold text-forest text-[11px] mr-0.5">{label}:</span>}
      <span title={address}>{shortAddress}</span>

      <button
        type="button"
        onClick={handleCopy}
        className="p-0.5 hover:text-forest text-ink/60 transition-colors rounded"
        title="Copy address"
        aria-label="Copy address to clipboard"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-forest" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>

      {showExplorer && (
        <a
          href={`${explorerUrl}/address/${address}`}
          target="_blank"
          rel="noreferrer"
          className="p-0.5 hover:text-forest text-ink/60 transition-colors rounded"
          title="View on block explorer"
          aria-label="View address on block explorer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}
