import React from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { ShieldCheck, CheckCircle2, Info, Lock } from 'lucide-react';

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
      subtitle: 'You are deploying this agreement terms hash directly to the SANKALP escrow contract.',
      actionName: 'Sign & Create on-chain',
      icon: ShieldCheck,
      details: [
        `Freelancer Address: ${terms?.freelancer}`,
        `Total Escrow Budget: ${terms?.totalAmount} MATIC across ${terms?.milestones?.length} milestones`,
        `Review Window: ${terms?.reviewWindowDays} days per milestone submission (silence triggers auto-approval)`,
        `Late Penalty: ${((terms?.latePenaltyBpsPerDay || 100) / 100).toFixed(1)}%/day up to ${((terms?.maxLatePenaltyBps || 3000) / 100).toFixed(0)}% maximum cap`,
        `Terms Immutability: An exact Keccak-256 canonical hash of the terms will be anchored on-chain.`
      ]
    },
    ACCEPT: {
      title: 'Confirm Agreement Acceptance',
      subtitle: 'You are cryptographically accepting all terms and obligations as Freelancer.',
      actionName: 'Sign & Accept Agreement',
      icon: CheckCircle2,
      details: [
        `Client Address: ${terms?.client}`,
        `Scope: ${terms?.milestones?.length} milestone deliverables`,
        `GitHub Repository: ${terms?.github?.repoUrl} (${terms?.github?.branch})`,
        `Commitment: You agree to deliver according to agreed deadlines. Late submissions incur ${((terms?.latePenaltyBpsPerDay || 100) / 100).toFixed(1)}%/day penalty deduction.`
      ]
    },
    FUND: {
      title: 'Confirm Escrow Funding',
      subtitle: 'You are locking funds from your wallet directly into non-custodial milestone escrow.',
      actionName: `Deposit & Lock ${terms?.totalAmount} MATIC`,
      icon: Lock,
      details: [
        `Locked Amount: ${terms?.totalAmount} MATIC (100% of agreement budget)`,
        `Escrow Custody: Funds are secured non-custodially until milestones are approved or resolved via arbitration.`,
        `Protocol Fee: Standard 100 bps (1%) deducted only upon successful milestone release.`
      ]
    },
    CANCEL: {
      title: 'Confirm Cancellation',
      subtitle: 'Cancel this unfunded agreement on-chain.',
      actionName: 'Confirm Cancel',
      icon: Info,
      details: [
        `Agreement will transition to Cancelled status. No escrow funds were locked.`
      ]
    }
  };

  const current = configs[stepType] || configs.CREATE;
  const Icon = current.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={current.title} maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-card bg-sage/60 border border-forest/20">
          <Icon className="w-5 h-5 text-forest shrink-0 mt-0.5" />
          <p className="text-xs text-ink/80 leading-relaxed font-medium">
            {current.subtitle}
          </p>
        </div>

        <div>
          <h4 className="text-xs font-heading font-semibold text-ink/60 uppercase tracking-wider mb-2">
            Plain-Language Summary of Commitments:
          </h4>
          <ul className="space-y-2 bg-ivory p-4 rounded-card border border-gray text-xs text-ink/80">
            {current.details.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-forest font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-3 border-t border-gray flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm} loading={isLoading}>
            {current.actionName}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
