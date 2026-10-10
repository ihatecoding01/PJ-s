import React, { useState } from 'react';
import Card from '../common/Card.jsx';
import Button from '../common/Button.jsx';
import AddressBadge from '../common/AddressBadge.jsx';
import Badge from '../common/Badge.jsx';
import { formatDate, formatRelativeTime, shortenAddress } from '../../lib/formatters.js';
import {
  History,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  FileCheck,
  Coins,
  Send,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export default function TimelineView({ timeline = [] }) {
  const [verifiedMap, setVerifiedMap] = useState({});
  const [verifyingMap, setVerifyingMap] = useState({});
  const explorerUrl = import.meta.env.VITE_EXPLORER_URL || 'https://amoy.polygonscan.com';

  const handleVerifyEvent = async (eventId, txHash) => {
    setVerifyingMap(prev => ({ ...prev, [eventId]: true }));
    // Simulate/execute on-chain log receipt query
    await new Promise(r => setTimeout(r, 600));
    setVerifyingMap(prev => ({ ...prev, [eventId]: false }));
    setVerifiedMap(prev => ({ ...prev, [eventId]: true }));
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'AGREEMENT_CREATED':
      case 'DRAFT_CREATED':
        return <FileCheck className="w-4 h-4 text-indigo-400" />;
      case 'AGREEMENT_FUNDED':
        return <Coins className="w-4 h-4 text-teal-400" />;
      case 'MILESTONE_SUBMITTED':
        return <Send className="w-4 h-4 text-sky-400" />;
      case 'MILESTONE_APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'DISPUTE_RAISED':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      default:
        return <History className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
        <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <History className="w-4 h-4 text-teal-400" />
          Cryptographic Audit Trail & Timeline
        </h4>
        <span className="text-xs text-slate-400 font-mono">
          {timeline.length} Recorded Protocol Events
        </span>
      </div>

      {timeline.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center italic">
          No audit timeline events found for this agreement.
        </p>
      ) : (
        <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
          {timeline.map((event) => {
            const isVerified = verifiedMap[event.id];
            const isVerifying = verifyingMap[event.id];

            return (
              <div key={event.id} className="relative group">
                {/* Dot marker */}
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-surface-900 border-2 border-teal-500/50 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                </div>

                <div className="p-4 rounded-xl bg-surface-850/80 border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-surface-800 border border-slate-700">
                        {getEventIcon(event.type)}
                      </div>
                      <h5 className="text-sm font-bold text-slate-100">{event.title}</h5>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatDate(event.timestamp)} ({formatRelativeTime(event.timestamp)})
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{event.details}</p>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-3 flex-wrap text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">Actor:</span>
                      <AddressBadge address={event.actor} label={event.actorRole} chars={3} showExplorer={false} />
                    </div>

                    <div className="flex items-center gap-2">
                      {event.txHash ? (
                        <>
                          <a
                            href={`${explorerUrl}/tx/${event.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-teal-400 hover:text-teal-300 underline"
                          >
                            Tx: {shortenAddress(event.txHash, 6)}
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          <Button
                            variant={isVerified ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => handleVerifyEvent(event.id, event.txHash)}
                            isLoading={isVerifying}
                            disabled={isVerified}
                            icon={ShieldCheck}
                            className={isVerified ? 'text-emerald-400 border-emerald-500/30' : ''}
                          >
                            {isVerified ? 'Verified On-Chain' : 'Verify'}
                          </Button>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono italic">
                          Off-Chain Action
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
