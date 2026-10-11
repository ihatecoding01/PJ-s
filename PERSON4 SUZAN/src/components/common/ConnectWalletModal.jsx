import React from 'react';
import { useWallet } from '../../context/WalletContext.jsx';
import { DEMO_ACCOUNTS } from '../../mock/mockStore.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import {
  Wallet,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
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
      title="Connect to SANKALP"
      subtitle="Sign in securely using your Ethereum or Polygon wallet"
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        {/* Section 1: MetaMask Extension */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider text-ink/60">
              Web3 Browser Wallet
            </span>
            {hasMetaMask ? (
              <Badge status="success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                MetaMask Ready
              </Badge>
            ) : (
              <Badge status="pending">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Extension Not Detected
              </Badge>
            )}
          </div>

          <div className="p-4 rounded-card border border-gray bg-white hover:border-forest/40 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-sage text-forest flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-forest" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-heading font-bold text-sm text-ink">MetaMask</h4>
                <p className="text-xs text-ink/70 mt-0.5 leading-relaxed">
                  Sign in with a cryptographic nonce. No passwords required.
                </p>
                <div className="mt-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={connectMetaMask}
                    loading={isConnecting}
                    disabled={!hasMetaMask || isConnecting}
                    className="w-full"
                  >
                    Connect MetaMask
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Quick Demo Personas */}
        <div className="space-y-2.5 pt-2 border-t border-gray">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider text-ink/60">
              Pre-funded Demo Personas
            </span>
            <span className="text-[10px] font-mono text-forest bg-sage px-2 py-0.5 rounded-full">
              Local / Hardhat
            </span>
          </div>

          <p className="text-xs text-ink/60">
            One-click authentication using Hardhat pre-funded key pairs:
          </p>

          <div className="space-y-2">
            {Object.keys(DEMO_ACCOUNTS).map((key) => {
              const acc = DEMO_ACCOUNTS[key];
              return (
                <button
                  key={key}
                  onClick={() => connectWithDemoAccount(key)}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-between p-3 rounded-[10px] bg-ivory border border-gray hover:border-forest hover:bg-sage-light/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-forest text-ivory flex items-center justify-center text-xs font-heading font-bold shrink-0">
                      {acc.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-heading font-semibold text-ink truncate group-hover:text-forest">
                        {acc.name}
                      </div>
                      <div className="text-[10px] font-mono text-ink/50 truncate">
                        {acc.address.slice(0, 8)}...{acc.address.slice(-6)} · {acc.role}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink/40 group-hover:text-forest group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
