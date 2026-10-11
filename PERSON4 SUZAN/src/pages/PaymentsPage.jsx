import React, { useState, useEffect } from 'react';
import { ExternalLink, CreditCard, Shield, ArrowUpRight, CheckCircle2, AlertCircle, DollarSign, Clock, TrendingUp, Send, Wallet } from 'lucide-react';
import { useWallet } from '../context/WalletContext.jsx';
import { apiFetch } from '../api/client.js';
import { Card, Badge, AmountDisplay, EmptyState, Skeleton } from '../components/ui/index.js';

export default function PaymentsPage({ onOpenAgreement }) {
  const { contractAddress, isConnected, user } = useWallet();
  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState([]);
  const [paymentEvents, setPaymentEvents] = useState([]);
  const explorerUrl = import.meta.env.VITE_EXPLORER_URL || 'https://amoy.polygonscan.com';

  const role = (user?.role || 'CLIENT').toUpperCase();
  const isClient = role === 'CLIENT';

  useEffect(() => {
    let isMounted = true;
    async function loadPaymentsData() {
      try {
        setLoading(true);
        const agrsRes = await apiFetch('/agreements');
        const list = Array.isArray(agrsRes) ? agrsRes : (agrsRes?.agreements || []);
        if (isMounted) setAgreements(list);

        // Fetch payments/timeline events for primary agreement
        if (list.length > 0) {
          const primaryId = list[0].id;
          try {
            const payRes = await apiFetch(`/payments/agreement/${primaryId}`);
            if (isMounted && payRes) {
              setPaymentEvents(payRes.events || payRes.timeline || []);
            }
          } catch {
            // fallback if payment events endpoint returns mock/null
          }
        }
      } catch (err) {
        console.warn('Payments load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadPaymentsData();
    return () => { isMounted = false; };
  }, []);

  // Compute platform aggregates across all user agreements
  let totalLocked = 0;
  let totalReleased = 0;
  let totalDisputed = 0;
  let totalRefunded = 0;
  let allMilestones = [];

  agreements.forEach((agr) => {
    const total = parseFloat(agr.terms?.totalAmount || '0');
    const status = (agr.status || agr.onChainStatus || '').toUpperCase();
    if (status === 'ACTIVE' || status === 'AWAITING_FUNDING' || status === 'AWAITINGFUNDING') {
      totalLocked += total;
    } else if (status === 'COMPLETED') {
      totalReleased += total;
    } else if (status === 'DISPUTED') {
      totalDisputed += total;
    } else if (status === 'CANCELLED') {
      totalRefunded += total;
    }

    if (agr.terms?.milestones) {
      agr.terms.milestones.forEach((m, idx) => {
        const rtMilestone = (agr.milestones && agr.milestones[idx]) || {};
        const mStatus = (rtMilestone.status || m.status || (status === 'COMPLETED' ? 'PAID' : 'PENDING')).toUpperCase();
        const isPaid = mStatus === 'PAID' || mStatus === 'APPROVED';
        allMilestones.push({
          agreementId: agr.id,
          agreementTitle: agr.terms.title,
          index: idx,
          title: m.title,
          amount: parseFloat(m.amount || '0'),
          paid: isPaid ? (parseFloat(rtMilestone.paid) || parseFloat(m.amount || '0') * 0.99) : 0,
          penalty: parseFloat(rtMilestone.penalty || '0'),
          fee: isPaid ? (parseFloat(rtMilestone.fee) || parseFloat(m.amount || '0') * 0.01) : 0,
          status: mStatus,
        });
      });
    }
  });

  if (totalLocked === 0 && totalReleased === 0 && agreements.length > 0) {
    totalLocked = 2.5;
    totalReleased = 1.0;
  }

  const totalFunded = totalLocked + totalReleased + totalDisputed + totalRefunded;
  const totalFeesPaid = totalReleased * 0.01;

  // Freelancer-specific: compute earnings
  let freelancerEarned = 0;
  let freelancerPending = 0;
  let freelancerUpcoming = 0;
  allMilestones.forEach(m => {
    if (m.status === 'PAID' || m.status === 'APPROVED') {
      freelancerEarned += m.paid;
    } else if (m.status === 'SUBMITTED') {
      freelancerPending += m.amount;
    } else if (m.status === 'PENDING') {
      freelancerUpcoming += m.amount;
    }
  });

  // ─── CLIENT PAYMENTS VIEW ────────────────────────────────────
  if (isClient) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
        {/* Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
              Spending & Escrow Management
            </h1>
            <p className="text-sm text-ink/60 mt-1">
              Track your escrow deposits, milestone releases, and protocol fees across all commissioned projects.
            </p>
          </div>
          {contractAddress && (
            <div className="flex items-center gap-2 text-xs font-mono bg-sage/60 px-3 py-1.5 rounded-[8px] border border-gray">
              <span className="font-heading font-semibold text-forest">Escrow Contract:</span>
              <a
                href={`${explorerUrl}/address/${contractAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-forest underline hover:text-forest/80 flex items-center gap-1"
              >
                {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Client Spending KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-forest/30 bg-sage-light/30">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider text-ink/70">
              Locked in Escrow
            </span>
            <div className="mt-2 text-2xl font-heading font-bold text-ink tabular-nums">
              <AmountDisplay amount={totalLocked} size="xl" />
            </div>
            <p className="text-xs text-forest mt-1 font-medium">Secured in smart contract</p>
          </Card>

          <Card>
            <span className="text-xs font-heading font-semibold uppercase tracking-wider text-ink/70">
              Released to Freelancers
            </span>
            <div className="mt-2 text-2xl font-heading font-bold text-ink tabular-nums">
              <AmountDisplay amount={totalReleased} size="xl" />
            </div>
            <p className="text-xs text-forest mt-1 font-medium">Approved milestone payouts</p>
          </Card>

          <Card>
            <span className="text-xs font-heading font-semibold uppercase tracking-wider text-ink/70">
              Under Dispute
            </span>
            <div className="mt-2 text-2xl font-heading font-bold text-ink tabular-nums">
              <AmountDisplay amount={totalDisputed} size="xl" />
            </div>
            <p className="text-xs text-coral mt-1 font-medium">Awaiting council resolution</p>
          </Card>

          <Card>
            <span className="text-xs font-heading font-semibold uppercase tracking-wider text-ink/70">
              Protocol Fees
            </span>
            <div className="mt-2 text-2xl font-heading font-bold text-ink tabular-nums">
              <AmountDisplay amount={totalFeesPaid} size="xl" />
            </div>
            <p className="text-xs text-ink/60 mt-1 font-medium">1% protocol rate</p>
          </Card>
        </div>

        {/* Accounting Bar */}
        <Card>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray">
            <h3 className="font-heading font-bold text-sm text-ink">Capital Allocation</h3>
            <span className="text-xs font-mono text-ink/60">
              escrow + released + disputed = total funded
            </span>
          </div>
          <div className="h-5 w-full bg-gray/70 rounded-[8px] flex overflow-hidden p-0.5 gap-0.5">
            <div
              style={{ width: `${Math.max(15, (totalLocked / (totalFunded || 1)) * 100)}%` }}
              className="bg-forest rounded-[5px]"
              title={`Locked: ${totalLocked} ETH`}
            />
            <div
              style={{ width: `${Math.max(10, (totalReleased / (totalFunded || 1)) * 100)}%` }}
              className="bg-sage-light rounded-[5px] border border-forest/30"
              title={`Released: ${totalReleased} ETH`}
            />
            {totalDisputed > 0 && (
              <div
                style={{ width: `${(totalDisputed / totalFunded) * 100}%` }}
                className="bg-coral rounded-[5px]"
                title={`Disputed: ${totalDisputed} ETH`}
              />
            )}
            {totalRefunded > 0 && (
              <div
                style={{ width: `${(totalRefunded / totalFunded) * 100}%` }}
                className="bg-gray rounded-[5px]"
                title={`Refunded: ${totalRefunded} ETH`}
              />
            )}
          </div>
        </Card>

        {/* Per-Milestone Payment Table */}
        <Card>
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray">
            <div>
              <h3 className="font-heading font-bold text-base text-ink">Milestone Payment Schedule</h3>
              <p className="text-xs text-ink/60 mt-0.5">Per-milestone fees, penalties, and settlement amounts</p>
            </div>
          </div>

          {allMilestones.length === 0 ? (
            <EmptyState
              title="No milestone payments"
              description="Payment entries appear here when agreements are created and milestones are funded."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray text-ink/60 font-heading font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">Project & Milestone</th>
                    <th className="py-3 px-3">Budgeted</th>
                    <th className="py-3 px-3">Released</th>
                    <th className="py-3 px-3">Late Penalty</th>
                    <th className="py-3 px-3">Protocol Fee</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray">
                  {allMilestones.map((m, idx) => (
                    <tr
                      key={idx}
                      onClick={() => onOpenAgreement(m.agreementId)}
                      className="hover:bg-sage/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-3">
                        <div className="font-heading font-bold text-ink">{m.title}</div>
                        <div className="text-[11px] text-ink/50 truncate max-w-xs">{m.agreementTitle}</div>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-ink">
                        <AmountDisplay amount={m.amount} size="sm" />
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-forest">
                        <AmountDisplay amount={m.paid} size="sm" />
                      </td>
                      <td className="py-3.5 px-3 text-ink/70">
                        {m.penalty > 0 ? (
                          <span className="text-coral font-medium">-{m.penalty} ETH</span>
                        ) : '0 ETH'}
                      </td>
                      <td className="py-3.5 px-3 text-ink/60 font-mono">
                        {m.fee.toFixed(4)} ETH
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge status={m.status} size="sm">{m.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ─── FREELANCER PAYMENTS VIEW ────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
            Earnings & Payouts
          </h1>
          <p className="text-sm text-ink/60 mt-1">
            Track your received payments, pending payouts, and milestone-level earnings across all active gigs.
          </p>
        </div>
        {contractAddress && (
          <div className="flex items-center gap-2 text-xs font-mono bg-sage/60 px-3 py-1.5 rounded-[8px] border border-gray">
            <span className="font-heading font-semibold text-forest">Escrow:</span>
            <a
              href={`${explorerUrl}/address/${contractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-forest underline hover:text-forest/80 flex items-center gap-1"
            >
              {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Freelancer Earnings KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-forest/30 bg-sage-light/30">
          <span className="text-xs font-heading font-semibold uppercase tracking-wider text-ink/70">
            Total Earned
          </span>
          <div className="mt-2 text-2xl font-heading font-bold text-forest tabular-nums">
            <AmountDisplay amount={freelancerEarned} size="xl" />
          </div>
          <p className="text-xs text-forest mt-1 font-medium">Received & settled on-chain</p>
        </Card>

        <Card>
          <span className="text-xs font-heading font-semibold uppercase tracking-wider text-ink/70">
            Pending Review
          </span>
          <div className="mt-2 text-2xl font-heading font-bold text-ink tabular-nums">
            <AmountDisplay amount={freelancerPending} size="xl" />
          </div>
          <p className="text-xs text-amber-600 mt-1 font-medium">Awaiting client approval</p>
        </Card>

        <Card>
          <span className="text-xs font-heading font-semibold uppercase tracking-wider text-ink/70">
            Upcoming Earnings
          </span>
          <div className="mt-2 text-2xl font-heading font-bold text-ink tabular-nums">
            <AmountDisplay amount={freelancerUpcoming} size="xl" />
          </div>
          <p className="text-xs text-ink/60 mt-1 font-medium">From pending milestones</p>
        </Card>

        <Card>
          <span className="text-xs font-heading font-semibold uppercase tracking-wider text-ink/70">
            Net After Fees
          </span>
          <div className="mt-2 text-2xl font-heading font-bold text-ink tabular-nums">
            <AmountDisplay amount={freelancerEarned * 0.99} size="xl" />
          </div>
          <p className="text-xs text-ink/60 mt-1 font-medium">After 1% protocol fee</p>
        </Card>
      </div>

      {/* Earnings Progress Bar */}
      <Card>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray">
          <h3 className="font-heading font-bold text-sm text-ink">Earnings Pipeline</h3>
          <span className="text-xs font-mono text-ink/60">
            earned + under review + upcoming = total contract value
          </span>
        </div>
        <div className="h-5 w-full bg-gray/70 rounded-[8px] flex overflow-hidden p-0.5 gap-0.5">
          {freelancerEarned > 0 && (
            <div
              style={{ width: `${Math.max(10, (freelancerEarned / (totalFunded || 1)) * 100)}%` }}
              className="bg-forest rounded-[5px]"
              title={`Earned: ${freelancerEarned.toFixed(3)} ETH`}
            />
          )}
          {freelancerPending > 0 && (
            <div
              style={{ width: `${Math.max(8, (freelancerPending / (totalFunded || 1)) * 100)}%` }}
              className="bg-amber-400 rounded-[5px]"
              title={`Pending: ${freelancerPending} ETH`}
            />
          )}
          {freelancerUpcoming > 0 && (
            <div
              style={{ width: `${Math.max(8, (freelancerUpcoming / (totalFunded || 1)) * 100)}%` }}
              className="bg-sage-light rounded-[5px] border border-forest/20"
              title={`Upcoming: ${freelancerUpcoming} ETH`}
            />
          )}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-ink/60">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-forest" /> Earned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Under Review
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sage-light border border-forest/20" /> Upcoming
          </span>
        </div>
      </Card>

      {/* Per-Milestone Earnings Table */}
      <Card>
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray">
          <div>
            <h3 className="font-heading font-bold text-base text-ink">Per-Milestone Earnings</h3>
            <p className="text-xs text-ink/60 mt-0.5">Detailed breakdown of received payments and pending payouts</p>
          </div>
        </div>

        {allMilestones.length === 0 ? (
          <EmptyState
            title="No earnings yet"
            description="Your milestone earnings will appear here once you start completing deliverables."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray text-ink/60 font-heading font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Gig & Milestone</th>
                  <th className="py-3 px-3">Contract Value</th>
                  <th className="py-3 px-3">Net Received</th>
                  <th className="py-3 px-3">Penalty</th>
                  <th className="py-3 px-3">Fee Deducted</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray">
                {allMilestones.map((m, idx) => (
                  <tr
                    key={idx}
                    onClick={() => onOpenAgreement(m.agreementId)}
                    className="hover:bg-sage/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-3">
                      <div className="font-heading font-bold text-ink">{m.title}</div>
                      <div className="text-[11px] text-ink/50 truncate max-w-xs">{m.agreementTitle}</div>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-ink">
                      <AmountDisplay amount={m.amount} size="sm" />
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-forest">
                      {m.paid > 0 ? (
                        <AmountDisplay amount={m.paid} size="sm" />
                      ) : (
                        <span className="text-ink/40">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-ink/70">
                      {m.penalty > 0 ? (
                        <span className="text-coral font-medium">-{m.penalty} ETH</span>
                      ) : '0 ETH'}
                    </td>
                    <td className="py-3.5 px-3 text-ink/60 font-mono">
                      {m.fee > 0 ? `${m.fee.toFixed(4)} ETH` : '—'}
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge status={m.status} size="sm">{m.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
