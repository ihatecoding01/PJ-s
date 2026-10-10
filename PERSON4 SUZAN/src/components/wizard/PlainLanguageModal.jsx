import React from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { ShieldAlert, CheckCircle, Info, ExternalLink } from 'lucide-react';

export default function PlainLanguageModal({
  isOpen,
  onClose,
  onConfirm,
  stepType, // 'CREATE' | 'ACCEPT' | 'FUND' | 'CANCEL'
  terms,
  isLoading
}) {
  if (!isOpen) return null;

  const configs = {
    CREATE: {
      title: 'Confirm On-Chain Agreement Creation',
      subtitle: 'You are deploying this agreement terms hash directly to the smart contract.',
      actionName: 'Sign & Create on-chain',
      icon: ShieldAlert,
      details: [
        `Target Smart Contract: FairWork.sol (createAgreement)`,
        `Freelancer Address: ${terms?.freelancer}`,
        `Total Escrow Budget: ${terms?.totalAmount} MATIC across ${terms?.milestones?.length} milestones`,
        `Review Window: ${terms?.reviewWindowDays} days per milestone submission (silence triggers auto-approval)`,
        `Late Penalty: ${((terms?.latePenaltyBpsPerDay || 100) / 100).toFixed(1)}%/day up to ${((terms?.maxLatePenaltyBps || 3000) / 100).toFixed(0)}% max cap`,
        `Terms Immutability: An exact keccak256 canonical hash of the terms will be anchored on-chain.`
      ]
    },
    ACCEPT: {
      title: 'Confirm Agreement Acceptance',
      subtitle: 'You are cryptographically accepting all terms and obligations as Freelancer.',
      actionName: 'Sign & Accept Agreement',
      icon: CheckCircle,
      details: [
        `Target Smart Contract: FairWork.sol (acceptAgreement)`,
        `Client Address: ${terms?.client}`,
        `Scope: ${terms?.milestones?.length} milestone deliverables`,
        `GitHub Repository: ${terms?.github?.repoUrl} (${terms?.github?.branch})`,
        `Commitment: You agree to deliver according to agreed deadlines. Late submissions incur ${((terms?.latePenaltyBpsPerDay || 100) / 100).toFixed(1)}%/day penalty deduction.`
      ]
    },
    FUND: {
      title: 'Confirm Escrow Funding',
      subtitle: 'You are transferring funds from your wallet into the milestone escrow contract.',
      actionName: `Deposit & Lock ${terms?.totalAmount} MATIC`,
      icon: ShieldAlert,
      details: [
        `Target Smart Contract: FairWork.sol (fundAgreement)`,
        `Locked Amount: ${terms?.totalAmount} MATIC (100% of agreement budget)`,
        `Escrow Custody: Funds are secured in the smart contract until milestones are approved or resolved via arbitration.`,
        `Protocol Fee: Standard 100 bps (1%) deducted only upon successful milestone release.`
      ]
    },
    CANCEL: {
      title: 'Confirm Cancellation',
      subtitle: 'Cancel this unfunded agreement on-chain.',
      actionName: 'Confirm Cancel',
      icon: Info,
      details: [
        `Target Smart Contract: FairWork.sol (cancelUnfunded)`,
        `Agreement will transition to Cancelled status. No escrow funds were locked.`
      ]
    }
  };

  const current = configs[stepType] || configs.CREATE;
  const Icon = current.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={current.title} maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30">
          <Icon className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            {current.subtitle}
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Plain-Language Summary of Obligations:
          </h4>
          <ul className="space-y-2 bg-surface-800/60 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300">
            {current.details.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-teal-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} isLoading={isLoading}>
            {current.actionName}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
