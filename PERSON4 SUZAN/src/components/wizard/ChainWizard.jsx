import React, { useState } from 'react';
import Card from '../common/Card.jsx';
import Button from '../common/Button.jsx';
import VerificationBadge from './VerificationBadge.jsx';
import PlainLanguageModal from './PlainLanguageModal.jsx';
import {
  txCreateAgreement,
  txAcceptAgreement,
  txFundAgreement,
  txCancelUnfunded
} from '../../chain/transactions.js';
import { linkChain } from '../../api/agreements.js';
import { useWallet } from '../../context/WalletContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { termsToChain } from '../../lib/termsToChain.js';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Coins,
  XCircle,
  FileCheck2,
  Lock
} from 'lucide-react';

export default function ChainWizard({ agreement, onAgreementUpdated }) {
  const { address } = useWallet();
  const toast = useToast();

  const [activeModalStep, setActiveModalStep] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const terms = agreement.terms;
  const isClient = address && terms?.client && address.toLowerCase() === terms.client.toLowerCase();
  const isFreelancer = address && terms?.freelancer && address.toLowerCase() === terms.freelancer.toLowerCase();

  // Wizard state determination
  // Step 1: Created on-chain?
  const hasOnchainId = Boolean(agreement.onchainId);
  // Step 2: Accepted?
  // If on-chain or mock state indicates accepted
  const isAccepted = agreement.status === 'Active' || agreement.status === 'AwaitingFunding' && hasOnchainId;
  // Step 3: Funded?
  const isFunded = agreement.status === 'Active' || agreement.status === 'Completed' || agreement.status === 'Disputed';

  // Execute Step 1: Create on-chain (Client)
  const handleExecuteCreate = async () => {
    try {
      setIsProcessing(true);
      let toastId = null;

      const { txHash, receipt, onchainId } = await txCreateAgreement(terms, {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Creating FairWork escrow agreement on-chain...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Agreement successfully created on-chain!');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      const assignedId = onchainId || 1;
      // Call POST /agreements/:id/link-chain
      const linked = await linkChain(agreement.id, {
        onchainId: assignedId,
        txHash
      });

      toast.success(`Agreement linked on-chain with ID #${assignedId}`);
      setActiveModalStep(null);
      if (onAgreementUpdated) onAgreementUpdated(linked);
    } catch (err) {
      toast.error(err.message || 'Failed to create agreement on-chain');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Step 2: Accept Agreement (Freelancer)
  const handleExecuteAccept = async () => {
    try {
      setIsProcessing(true);
      let toastId = null;

      await txAcceptAgreement(agreement.onchainId, {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Accepting agreement on-chain...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Agreement accepted!');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      toast.success('Agreement successfully accepted on-chain!');
      setActiveModalStep(null);
      if (onAgreementUpdated) onAgreementUpdated({ ...agreement, status: 'AwaitingFunding' });
    } catch (err) {
      toast.error(err.message || 'Failed to accept agreement');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Step 3: Fund Agreement (Client)
  const handleExecuteFund = async () => {
    try {
      setIsProcessing(true);
      let toastId = null;

      const { totalWei } = termsToChain(terms);

      await txFundAgreement(agreement.onchainId, totalWei, {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, `Funding escrow with ${terms.totalAmount} MATIC...`);
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Escrow funds successfully locked in contract!');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      toast.success(`Escrow active! Locked ${terms.totalAmount} MATIC into smart contract.`);
      setActiveModalStep(null);
      if (onAgreementUpdated) onAgreementUpdated({ ...agreement, status: 'Active' });
    } catch (err) {
      toast.error(err.message || 'Failed to fund agreement');
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel Unfunded
  const handleExecuteCancel = async () => {
    try {
      setIsProcessing(true);
      let toastId = null;

      await txCancelUnfunded(agreement.onchainId || 0, {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Cancelling unfunded agreement on-chain...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Agreement cancelled');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      toast.info('Agreement cancelled');
      setActiveModalStep(null);
      if (onAgreementUpdated) onAgreementUpdated({ ...agreement, status: 'Cancelled' });
    } catch (err) {
      toast.error(err.message || 'Failed to cancel');
    } finally {
      setIsProcessing(false);
    }
  };

  const steps = [
    {
      num: 1,
      title: 'Create On-Chain',
      desc: 'Client signs createAgreement to record terms hash in FairWork contract.',
      done: hasOnchainId,
      isCurrent: !hasOnchainId,
      action: () => setActiveModalStep('CREATE'),
      actionLabel: 'Create On-Chain',
      eligible: isClient
    },
    {
      num: 2,
      title: 'Freelancer Acceptance',
      desc: 'Freelancer signs acceptAgreement to lock in delivery obligations.',
      done: isAccepted,
      isCurrent: hasOnchainId && !isAccepted,
      action: () => setActiveModalStep('ACCEPT'),
      actionLabel: 'Accept Agreement',
      eligible: isFreelancer
    },
    {
      num: 3,
      title: 'Fund Escrow',
      desc: 'Client deposits total MATIC into the smart contract escrow.',
      done: isFunded,
      isCurrent: hasOnchainId && isAccepted && !isFunded,
      action: () => setActiveModalStep('FUND'),
      actionLabel: `Fund ${terms.totalAmount} MATIC`,
      eligible: isClient
    }
  ];

  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-teal-400" />
            On-Chain Escrow Setup Wizard
          </h3>
          <p className="text-xs text-slate-400">
            Cryptographic state machine transitions required before work commences.
          </p>
        </div>

        {agreement.onchainId && (
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300">
            On-Chain ID: #{agreement.onchainId}
          </span>
        )}
      </div>

      {/* Verification Badge */}
      <VerificationBadge
        terms={terms}
        onchainTermsHash={agreement.termsHash}
      />

      {/* Steps Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((s) => (
          <div
            key={s.num}
            className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
              s.done
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : s.isCurrent
                ? 'bg-surface-800/80 border-teal-500/40 shadow-glow-teal'
                : 'bg-surface-900/40 border-slate-800 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-slate-400">Step 0{s.num}</span>
                {s.done ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                  </span>
                ) : s.isCurrent ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded animate-pulse">
                    <Clock className="w-3.5 h-3.5" /> Action Needed
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">Upcoming</span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-100">{s.title}</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{s.desc}</p>
            </div>

            {s.isCurrent && (
              <div className="pt-4 mt-4 border-t border-slate-800/80">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={s.action}
                  disabled={!s.eligible}
                  className="w-full"
                >
                  {s.eligible ? s.actionLabel : `Waiting for ${s.num === 2 ? 'Freelancer' : 'Client'}`}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cancel option before Active */}
      {!isFunded && hasOnchainId && (isClient || isFreelancer) && (
        <div className="pt-2 flex justify-end">
          <Button
            variant="danger"
            size="sm"
            onClick={() => setActiveModalStep('CANCEL')}
            icon={XCircle}
          >
            Cancel Unfunded Agreement
          </Button>
        </div>
      )}

      {/* Plain Language Confirmation Modal */}
      <PlainLanguageModal
        isOpen={Boolean(activeModalStep)}
        onClose={() => setActiveModalStep(null)}
        stepType={activeModalStep}
        terms={terms}
        isLoading={isProcessing}
        onConfirm={() => {
          if (activeModalStep === 'CREATE') handleExecuteCreate();
          else if (activeModalStep === 'ACCEPT') handleExecuteAccept();
          else if (activeModalStep === 'FUND') handleExecuteFund();
          else if (activeModalStep === 'CANCEL') handleExecuteCancel();
        }}
      />
    </Card>
  );
}
