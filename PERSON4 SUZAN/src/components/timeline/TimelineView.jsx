import React, { useState } from 'react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import AddressChip from '../ui/AddressChip.jsx';
import TimelineItem from '../ui/TimelineItem.jsx';
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
    await new Promise(r => setTimeout(r, 600));
    setVerifyingMap(prev => ({ ...prev, [eventId]: false }));
    setVerifiedMap(prev => ({ ...prev, [eventId]: true }));
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'AGREEMENT_CREATED':
      case 'DRAFT_CREATED':
        return <FileCheck className="w-4 h-4 text-forest" />;
      case 'AGREEMENT_FUNDED':
        return <Coins className="w-4 h-4 text-forest" />;
      case 'MILESTONE_SUBMITTED':
        return <Send className="w-4 h-4 text-forest" />;
      case 'MILESTONE_APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-forest" />;
      case 'DISPUTE_RAISED':
        return <AlertTriangle className="w-4 h-4 text-coral" />;
      default:
        return <History className="w-4 h-4 text-ink/50" />;
    }
  };

  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-gray flex-wrap gap-2">
        <h4 className="text-base font-heading font-bold text-ink flex items-center gap-2">
          <History className="w-4 h-4 text-forest" />
          Cryptographic Audit Trail & Event Timeline
        </h4>
        <span className="text-xs text-ink/60 font-mono">
          {timeline.length} Recorded Protocol Events
        </span>
      </div>

      {timeline.length === 0 ? (
        <div className="text-center py-10 text-xs text-ink/50">
          No audit events recorded yet. Events appear here as contract state changes occur.
        </div>
      ) : (
        <div className="relative pl-2 space-y-6">
          {timeline.map((event, idx) => {
            const eventId = event.id || `event-${idx}`;
            const isVerified = verifiedMap[eventId];
            const isVerifying = verifyingMap[eventId];
            const isLast = idx === timeline.length - 1;

            return (
              <TimelineItem
                key={eventId}
                timestamp={event.timestamp || event.createdAt}
                actor={event.actor || event.by}
                role={event.role}
                title={event.type?.replace(/_/g, ' ') || 'Protocol Action'}
                description={event.description || event.message}
                txHash={event.txHash}
                status={event.status || 'completed'}
                isLast={isLast}
                onVerify={event.txHash ? () => handleVerifyEvent(eventId, event.txHash) : null}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}
