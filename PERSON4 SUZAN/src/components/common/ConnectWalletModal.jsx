import React from 'react';
import { useWallet } from '../../context/WalletContext.jsx';
import { DEMO_ACCOUNTS } from '../../mock/mockStore.js';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import {
  Wallet,
  ShieldCheck,
  UserCheck,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export default function ConnectWalletModal() {
  const {
    isConnectModalOpen,
    closeConnectModal,
    connectMetaMask,
    connectWithDemoAccount,
    isConnecting
  } = useWallet();

  const hasMetaMask = typeof window !== 'undefined' && Boolean(window.ethereum);

  return (
    <Modal
      isOpen={isConnectModalOpen}
      onClose={closeConnectModal}
      title="Connect to FairWork"
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        {/* Section 1: MetaMask Extension */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Web3 Wallet
            </span>
            {hasMetaMask ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                MetaMask Detected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                <AlertTriangle className="w-3 h-3" />
                No Extension Detected
              </span>
            )}
          </div>

          <div className="p-4 rounded-xl border border-slate-750 bg-surface-850 hover:border-teal-500/40 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-100">MetaMask</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connect using your browser extension (Localhost 8545 or Polygon Amoy).
                </p>

                {hasMetaMask ? (
                  <div className="mt-3 space-y-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={connectMetaMask}
                      isLoading={isConnecting}
                    >
                      Connect MetaMask
                    </Button>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      💡 <strong>Note:</strong> If the popup doesn't appear, check your browser's toolbar and click the <strong>MetaMask Fox icon</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3">
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-semibold underline"
                    >
                      Install MetaMask Extension <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface-900 px-3 text-slate-400 font-semibold tracking-wider">
              Or Instant Demo Sign-In
            </span>
          </div>
        </div>

        {/* Section 2: Demo Personas with Real Backend SIWE */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pre-funded local accounts (no extension needed):</span>
          </div>

          <div className="space-y-2">
            {Object.entries(DEMO_ACCOUNTS).slice(0, 3).map(([key, acc]) => {
              const roleColor =
                acc.role === 'CLIENT'
                  ? 'border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-950/20'
                  : acc.role === 'FREELANCER'
                  ? 'border-teal-500/30 hover:border-teal-500/60 bg-teal-950/20'
                  : 'border-purple-500/30 hover:border-purple-500/60 bg-purple-950/20';

              const badgeColor =
                acc.role === 'CLIENT'
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  : acc.role === 'FREELANCER'
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30';

              return (
                <button
                  key={key}
                  disabled={isConnecting}
                  onClick={() => connectWithDemoAccount(key)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all group ${roleColor} disabled:opacity-50`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center shrink-0">
                      {acc.role === 'ARBITRATOR' ? (
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-teal-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100 group-hover:text-white truncate">
                          {acc.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-semibold uppercase ${badgeColor}`}>
                          {acc.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                        {acc.address.substring(0, 14)}...
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
