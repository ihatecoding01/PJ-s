import React, { useState } from 'react';
import Button from '../common/Button.jsx';
import AddressBadge from '../common/AddressBadge.jsx';
import { txSubmitEvidence } from '../../chain/transactions.js';
import { submitEvidence as apiSubmitEvidence } from '../../api/disputes.js';
import { useWallet } from '../../context/WalletContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatRelativeTime, shortenAddress } from '../../lib/formatters.js';
import { ShieldCheck, Send, FileText } from 'lucide-react';

export default function EvidenceThread({
  agreementId,
  onchainId,
  milestoneIdx,
  evidenceList = [],
  onEvidenceSubmitted
}) {
  const { address } = useWallet();
  const toast = useToast();
  const [newEvidence, setNewEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitRebuttal = async (e) => {
    e.preventDefault();
    if (!newEvidence.trim()) return;

    try {
      setIsSubmitting(true);
      let toastId = null;

      // On-chain submitEvidence
      await txSubmitEvidence(onchainId || 1, milestoneIdx, newEvidence.trim(), {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Anchoring evidence hash on-chain...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Evidence submitted on-chain!');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      // Backend evidence store
      await apiSubmitEvidence(agreementId, milestoneIdx, {
        text: newEvidence.trim()
      });

      toast.success('Evidence rebuttal recorded!');
      setNewEvidence('');
      if (onEvidenceSubmitted) onEvidenceSubmitted();
    } catch (err) {
      toast.error(err.message || 'Failed to submit evidence');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
        <FileText className="w-4 h-4 text-teal-400" />
        Cryptographic Evidence Submissions ({evidenceList.length})
      </h5>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {evidenceList.length === 0 ? (
          <p className="text-xs text-slate-500 py-2 italic">No evidence recorded yet.</p>
        ) : (
          evidenceList.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-surface-900 border border-slate-800 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <AddressBadge address={item.author} chars={3} showExplorer={false} />
                <span className="text-[11px] text-slate-500 font-mono">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>
              <p className="text-slate-200 leading-relaxed whitespace-pre-line">{item.text}</p>
              {item.evidenceHash && (
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 pt-1 border-t border-slate-850">
                  <ShieldCheck className="w-3 h-3 text-teal-400" />
                  <span>Evidence Hash: {shortenAddress(item.evidenceHash, 6)}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Rebuttal submission form */}
      <form onSubmit={handleSubmitRebuttal} className="space-y-2 pt-2 border-t border-slate-800">
        <textarea
          rows={3}
          value={newEvidence}
          onChange={(e) => setNewEvidence(e.target.value)}
          placeholder="Submit additional evidence, test logs, or rebuttal argument..."
          className="w-full bg-surface-850 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 resize-none"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            isLoading={isSubmitting}
            disabled={!newEvidence.trim()}
            icon={Send}
          >
            Submit Evidence Rebuttal
          </Button>
        </div>
      </form>
    </div>
  );
}
