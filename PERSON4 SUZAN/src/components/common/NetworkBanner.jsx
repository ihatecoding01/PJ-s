import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useWallet } from '../../context/WalletContext.jsx';
import Button from './Button.jsx';
import { SUPPORTED_NETWORKS } from '../../chain/contract.js';

export default function NetworkBanner() {
  const { isWrongNetwork, chainId, configuredChainId, switchNetwork } = useWallet();

  if (!isWrongNetwork) return null;

  const targetNet = SUPPORTED_NETWORKS[configuredChainId] || { name: `Chain ${configuredChainId}` };

  return (
    <div className="bg-gradient-to-r from-rose-950/90 via-surface-900 to-amber-950/90 border-b border-rose-500/40 px-4 py-2.5 text-slate-100 z-40">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
          <span>
            <strong className="text-rose-300 font-semibold">Wrong Network Detected:</strong> Connected to Chain ID{' '}
            <code className="text-rose-200 font-mono bg-rose-950 px-1.5 py-0.5 rounded">{chainId}</code>, but FairWork requires{' '}
            <strong className="text-teal-300">{targetNet.name}</strong> (Chain ID{' '}
            <code className="text-teal-200 font-mono bg-surface-800 px-1.5 py-0.5 rounded">{configuredChainId}</code>).
          </span>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={switchNetwork}
          icon={RefreshCw}
          className="whitespace-nowrap font-medium"
        >
          Switch to {targetNet.name}
        </Button>
      </div>
    </div>
  );
}
