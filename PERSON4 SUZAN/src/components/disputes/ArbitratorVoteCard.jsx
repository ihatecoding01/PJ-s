import React, { useState } from 'react';
import Card from '../common/Card.jsx';
import Button from '../common/Button.jsx';
import AddressBadge from '../common/AddressBadge.jsx';
import CountdownTimer from '../common/CountdownTimer.jsx';
import { txCastVote, txFinalizeDispute } from '../../chain/transactions.js';
import { useWallet } from '../../context/WalletContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatBps } from '../../lib/formatters.js';
import { Scale, CheckCircle2, Clock, ShieldCheck, Gavel, Award } from 'lucide-react';

export default function ArbitratorVoteCard({
  dispute,
  onchainId,
  milestoneIdx,
  onDisputeUpdated
}) {
  const { address } = useWallet();
  const toast = useToast();

  const [freelancerShareBps, setFreelancerShareBps] = useState(7000); // default 70%
  const [isCastingVote, setIsCastingVote] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const arbitrators = dispute?.arbitrators || [];
  const votes = dispute?.votes || {};
  const isArbitrator = address && arbitrators.some(a => a.toLowerCase() === address.toLowerCase());
  const hasVoted = address && votes[address.toLowerCase()] !== undefined;

  // Final voting window target (simulate 72h window)
  const votingEndTimestamp = dispute?.votingEndTimestamp || (Date.now() + 48 * 3600000);

  const handleCastVote = async () => {
    try {
      setIsCastingVote(true);
      let toastId = null;

      await txCastVote(onchainId || 1, milestoneIdx, freelancerShareBps, {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, `Casting arbitrator vote: ${formatBps(freelancerShareBps)} share...`);
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Vote recorded on-chain!');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      toast.success('Vote cast successfully!');
      if (onDisputeUpdated) onDisputeUpdated();
    } catch (err) {
      toast.error(err.message || 'Failed to cast vote');
    } finally {
      setIsCastingVote(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setIsFinalizing(true);
      let toastId = null;

      await txFinalizeDispute(onchainId || 1, milestoneIdx, {
        onPending: (hash) => {
          toastId = toast.pendingTx(hash, 'Finalizing dispute and executing escrow distribution...');
        },
        onSuccess: (rec) => {
          if (toastId) toast.confirmedTx(toastId, rec.hash, 'Dispute finalized on-chain!');
        },
        onError: (err) => {
          if (toastId) toast.failedTx(toastId, err);
        }
      });

      toast.success('Dispute resolved! Funds split executed according to arbitrator consensus.');
      if (onDisputeUpdated) onDisputeUpdated();
    } catch (err) {
      toast.error(err.message || 'Failed to finalize dispute');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Gavel className="w-4 h-4 text-amber-400" />
          Arbitration Tribunal Panel (3 Selected Arbitrators)
        </h4>
        <CountdownTimer
          targetTime={votingEndTimestamp}
          label="Voting Window"
        />
      </div>

      {/* Outcome Banner if Resolved */}
      {dispute?.resolved && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-surface-900 to-teal-950/40 border border-emerald-500/40 flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" /> Dispute Finalized & Resolved
            </span>
            <p className="text-xs text-slate-200">
              Resolved Split: <strong>{formatBps(dispute.resolvedFreelancerShareBps)} Freelancer</strong> /{' '}
              <strong>{formatBps(10000 - dispute.resolvedFreelancerShareBps)} Client</strong>
            </p>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-850 text-slate-400">
              Resolution Method: {dispute.resolutionMethod || 'VOTE'}
            </span>
          </div>
        </div>
      )}

      {/* Arbitrators list */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {arbitrators.map((arb, i) => {
          const arbVoted = votes[arb.toLowerCase()] !== undefined;
          return (
            <div
              key={i}
              className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                arbVoted
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-surface-850 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  Arbitrator #{i + 1}
                </span>
                {arbVoted ? (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Voted
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-medium flex items-center gap-0.5">
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                )}
              </div>
              <AddressBadge address={arb} chars={3} showExplorer={false} />
            </div>
          );
        })}
      </div>

      {/* Arbitrator Voting Form (if current wallet is arbitrator) */}
      {isArbitrator && !dispute?.resolved && (
        <div className="p-4 rounded-xl bg-surface-850 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-400" />
              Cast Your Arbitrator Vote
            </span>
            <span className="font-mono text-xs font-bold text-teal-300">
              Freelancer: {formatBps(freelancerShareBps)} | Client: {formatBps(10000 - freelancerShareBps)}
            </span>
          </div>

          <div className="space-y-1">
            <input
              type="range"
              min="0"
              max="10000"
              step="500"
              value={freelancerShareBps}
              onChange={(e) => setFreelancerShareBps(Number(e.target.value))}
              disabled={hasVoted}
              className="w-full accent-teal-400 cursor-pointer h-2 bg-surface-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0% (Full Refund to Client)</span>
              <span>50% (Equal Split)</span>
              <span>100% (Full Payout to Freelancer)</span>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              variant="primary"
              size="sm"
              onClick={handleCastVote}
              isLoading={isCastingVote}
              disabled={hasVoted}
              icon={Gavel}
            >
              {hasVoted ? 'Vote Already Recorded' : 'Submit Binding Vote'}
            </Button>
          </div>
        </div>
      )}

      {/* Finalize Button (anyone can call after voting window or when votes complete) */}
      {!dispute?.resolved && (
        <div className="pt-2 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFinalize}
            isLoading={isFinalizing}
            icon={ShieldCheck}
          >
            Finalize Dispute & Execute Escrow Split
          </Button>
        </div>
      )}
    </Card>
  );
}
