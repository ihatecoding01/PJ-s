import React, { useState } from 'react';
import Card from '../common/Card.jsx';
import Button from '../common/Button.jsx';
import AddressBadge from '../common/AddressBadge.jsx';
import { txAcceptAmendment } from '../../chain/transactions.js';
import { useWallet } from '../../context/WalletContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../lib/formatters.js';
import { CalendarClock, CheckCircle2, Clock, Plus } from 'lucide-react';

export default function AmendmentsList({
  agreement,
  amendments = [],
  onProposeClick,
  onAmendmentUpdated
}) {
  const { address } = useWallet();
  const toast = useToast();
  const [isAccepting, setIsAccepting] = useState(false);

  const isClient = address && agreement?.terms?.client && address.toLowerCase() === agreement.terms.client.toLowerCase();
  const isFreelancer = address && agreement?.terms?.freelancer && address.toLowerCase() === agreement.terms.freelancer.toLowerCase();

  // Find any pending amendment
  const pending = amendments.find(a => a.status === 'Pending');

  const handleAccept = async (amendmentId) => {
    try {
      setIsAccepting(true);
      let toastId = null;

      await txAcceptAmendment(agreement.onchainId || 1, amendmentId, {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Accepting deadline amendment on-chain...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Amendment accepted! New deadline active.');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      toast.success('Amendment accepted on-chain!');
      if (onAmendmentUpdated) onAmendmentUpdated();
    } catch (err) {
      toast.error(err.message || 'Failed to accept amendment');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-teal-400" />
          Contract Amendments & Deadline Extensions
        </h4>
        {(isClient || isFreelancer) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onProposeClick}
            icon={Plus}
          >
            Propose Amendment
          </Button>
        )}
      </div>

      {/* Pending Banner for Counterparty */}
      {pending && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-surface-900 to-indigo-950/40 border border-amber-500/40 flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Pending Amendment Proposal
            </span>
            <p className="text-xs text-slate-200">
              New deadline proposed for Milestone #{pending.idx + 1}: <strong>{formatDate(pending.newDeadline)}</strong>
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Proposed by:</span>
              <AddressBadge address={pending.proposedBy} chars={3} showExplorer={false} />
            </div>
          </div>

          {address && pending.proposedBy && address.toLowerCase() !== pending.proposedBy.toLowerCase() && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleAccept(pending.id)}
              isLoading={isAccepting}
              icon={CheckCircle2}
            >
              Accept Amendment On-Chain
            </Button>
          )}
        </div>
      )}

      {/* History List */}
      {amendments.length === 0 ? (
        <p className="text-xs text-slate-500 py-2">
          No amendments proposed. Both parties can propose deadline extensions if unexpected delays arise.
        </p>
      ) : (
        <div className="space-y-2">
          {amendments.map((am) => (
            <div key={am.id} className="p-3 rounded-xl bg-surface-850 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-200">Milestone #{am.idx + 1} Extended</span>
                <p className="text-slate-400 text-[11px]">New deadline: {formatDate(am.newDeadline)}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                am.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {am.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
