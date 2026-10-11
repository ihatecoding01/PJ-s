import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, Info } from 'lucide-react';

/**
 * SANKALP TxStatus Component
 * Displays transaction progression:
 * - Pending state with animated loader
 * - Real confirmed state with block explorer link
 * - Reverted / failed state with clear error explanation
 * - Strict Rule: In mock mode, chain actions are clearly marked "Mock mode: no real transaction"
 *   and NEVER display a simulated fake confirmed tx hash.
 */
export default function TxStatus({
  status, // 'idle' | 'pending' | 'confirmed' | 'reverted' | 'mock_disabled'
  txHash,
  errorMessage,
  className = '',
}) {
  const explorerUrl = import.meta.env.VITE_EXPLORER_URL || 'https://amoy.polygonscan.com';
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  if (!status || status === 'idle') return null;

  if (isMock || status === 'mock_disabled') {
    return (
      <div className={`flex items-start gap-2.5 p-3.5 bg-sage/80 border border-gray rounded-[10px] text-xs text-forest ${className}`}>
        <Info className="w-4 h-4 text-forest shrink-0 mt-0.5" />
        <div>
          <span className="font-heading font-semibold">Mock mode: no real transaction.</span>
          <p className="text-ink/70 mt-0.5">
            Blockchain transactions require a live network connection with MetaMask and deployed contracts. Connect to localhost (8545) or Polygon Amoy to execute live on-chain transactions.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className={`flex items-start gap-2.5 p-3.5 bg-white border-2 border-forest rounded-[10px] text-xs text-forest shadow-sm ${className}`}>
        <Loader2 className="w-4 h-4 text-forest animate-spin shrink-0 mt-0.5" />
        <div>
          <span className="font-heading font-semibold">Submitting transaction to blockchain...</span>
          {txHash ? (
            <p className="text-ink/70 mt-0.5 font-mono">
              Tx submitted: {txHash.slice(0, 10)}...{txHash.slice(-6)}. Awaiting block inclusion.
            </p>
          ) : (
            <p className="text-ink/70 mt-0.5">Please confirm the transaction in your connected wallet.</p>
          )}
        </div>
      </div>
    );
  }

  if (status === 'confirmed') {
    return (
      <div className={`flex items-start gap-2.5 p-3.5 bg-sage-light border border-forest/30 rounded-[10px] text-xs text-forest ${className}`}>
        <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-heading font-semibold">Transaction confirmed on-chain!</span>
          {txHash && (
            <div className="mt-1">
              <a
                href={`${explorerUrl}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-forest underline hover:text-forest/80"
              >
                View on block explorer ({txHash.slice(0, 10)}...{txHash.slice(-6)})
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === 'reverted' || status === 'error') {
    return (
      <div className={`flex items-start gap-2.5 p-3.5 bg-coral/20 border border-coral/60 rounded-[10px] text-xs text-ink ${className}`}>
        <AlertCircle className="w-4 h-4 text-coral shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-heading font-semibold text-coral-900">Transaction Reverted</span>
          <p className="text-ink/80 mt-0.5 leading-relaxed break-words font-mono text-[11px]">
            {errorMessage || 'Transaction execution reverted by EVM.'}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
