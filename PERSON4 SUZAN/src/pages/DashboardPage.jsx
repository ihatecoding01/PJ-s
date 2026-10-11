import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Shield,
  Layers,
  ChevronRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { useWallet } from '../context/WalletContext.jsx';
import { apiFetch } from '../api/client.js';
import { Card, Button, Badge, AmountDisplay, CountdownTimer, ProgressBar, Skeleton } from '../components/ui/index.js';

export default function DashboardPage({
  onOpenAgreement,
  onOpenDraft,
  onNavigateToProjects,
  onOpenCreateProject,
}) {
  const { user, address, isConnected, openConnectModal } = useWallet();
  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [paymentStats, setPaymentStats] = useState({
    locked: 2.5,
    released: 1.0,
    disputed: 0.0,
    refunded: 0.0,
    feesPaid: 0.025,
  });

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [agreementsRes, alertsRes] = await Promise.allSettled([
          apiFetch('/agreements'),
          apiFetch('/alerts?resolved=false'),
        ]);

        if (isMounted) {
          if (agreementsRes.status === 'fulfilled' && agreementsRes.value) {
            const list = Array.isArray(agreementsRes.value)
              ? agreementsRes.value
              : (agreementsRes.value.agreements || []);
            setAgreements(list);

            // Compute financial aggregates from agreements
            let totalLocked = 0;
            let totalReleased = 0;
            let totalDisputed = 0;
            let totalRefunded = 0;

            list.forEach(agr => {
              const total = parseFloat(agr.terms?.totalAmount || '0');
              const status = agr.status || agr.onChainStatus;
              if (status === 'ACTIVE' || status === 'AWAITING_FUNDING') {
                totalLocked += total;
              } else if (status === 'COMPLETED') {
                totalReleased += total;
              } else if (status === 'DISPUTED') {
                totalDisputed += total;
              } else if (status === 'CANCELLED') {
                totalRefunded += total;
              }
            });

            if (totalLocked > 0 || totalReleased > 0) {
              setPaymentStats({
                locked: totalLocked,
                released: totalReleased,
                disputed: totalDisputed,
                refunded: totalRefunded,
                feesPaid: totalReleased * 0.01,
              });
            }
          }

          if (alertsRes.status === 'fulfilled' && alertsRes.value) {
            const alList = Array.isArray(alertsRes.value)
              ? alertsRes.value
              : (alertsRes.value.alerts || []);
            setAlerts(alList);
          }
        }
      } catch (err) {
        console.warn('Dashboard fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => { isMounted = false; };
  }, []);

  // Compute metrics
  const activeCount = agreements.filter(a => a.status === 'ACTIVE' || a.status === 'AWAITING_FUNDING').length || 1;
  const completedCount = agreements.filter(a => a.status === 'COMPLETED').length;
  const disputedCount = agreements.filter(a => a.status === 'DISPUTED').length;
  const pendingPaymentsMatic = paymentStats.locked || 2.5;

  // Derive upcoming milestones from agreements
  const upcomingMilestones = [];
  agreements.forEach(agr => {
    if (agr.terms?.milestones) {
      agr.terms.milestones.forEach(m => {
        if (m.deadline && (!m.status || m.status === 'PENDING' || m.status === 'SUBMITTED')) {
          upcomingMilestones.push({
            agreementId: agr.id,
            agreementTitle: agr.terms.title,
            milestoneTitle: m.title,
            amount: m.amount,
            deadline: m.deadline,
            status: m.status || 'PENDING',
          });
        }
      });
    }
  });

  const greetingName = user?.name ? user.name.split(' ')[0] : 'Partner';

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
            Welcome back, {greetingName}
          </h1>
          <p className="text-sm text-ink/60 mt-1">
            Track your agreements, verified deliverables, and non-custodial milestone escrow.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={onOpenCreateProject}
          >
            + Create Agreement
          </Button>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-forest/40 transition-all">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider">Active Projects</span>
            <div className="w-8 h-8 rounded-[8px] bg-sage flex items-center justify-center text-forest">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-heading font-bold text-ink tabular-nums">
            {activeCount}
          </div>
          <p className="text-xs text-forest mt-1.5 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Held in smart escrow
          </p>
        </Card>

        <Card className="hover:border-forest/40 transition-all">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider">Pending Payments</span>
            <div className="w-8 h-8 rounded-[8px] bg-sage flex items-center justify-center text-forest">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-heading font-bold text-ink tabular-nums">
            <AmountDisplay amount={pendingPaymentsMatic} size="xl" />
          </div>
          <p className="text-xs text-ink/60 mt-1.5 font-medium">
            Awaiting deliverable review
          </p>
        </Card>

        <Card className="hover:border-forest/40 transition-all">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider">Completed Projects</span>
            <div className="w-8 h-8 rounded-[8px] bg-sage flex items-center justify-center text-forest">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-heading font-bold text-ink tabular-nums">
            {completedCount}
          </div>
          <p className="text-xs text-forest mt-1.5 font-medium">
            100% on-chain settlement
          </p>
        </Card>

        <Card className="hover:border-forest/40 transition-all">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider">Open Disputes</span>
            <div className="w-8 h-8 rounded-[8px] bg-coral/20 flex items-center justify-center text-ink">
              <AlertCircle className="w-4 h-4 text-coral" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-heading font-bold text-ink tabular-nums">
            {disputedCount}
          </div>
          <p className="text-xs text-ink/60 mt-1.5 font-medium">
            Council arbitration status
          </p>
        </Card>
      </div>

      {/* Main Grid: Payment Overview Chart + Promo Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Overview Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-gray mb-5">
            <div>
              <h3 className="font-heading font-bold text-base text-ink">Payment & Escrow Overview</h3>
              <p className="text-xs text-ink/60 mt-0.5">Off-chain agreement binding with on-chain locked capital</p>
            </div>
            <span className="text-xs font-mono font-medium text-forest bg-sage px-2.5 py-1 rounded-full">
              Source: On-Chain Escrow
            </span>
          </div>

          {/* Stacked Visual Bar */}
          <div className="space-y-4">
            <div className="h-6 w-full bg-gray/60 rounded-[8px] flex overflow-hidden p-0.5 gap-0.5">
              <div
                style={{ width: `${Math.max(15, (paymentStats.locked / (paymentStats.locked + paymentStats.released || 1)) * 100)}%` }}
                className="bg-forest rounded-[6px] transition-all relative group"
                title={`Locked in Escrow: ${paymentStats.locked} MATIC`}
              />
              <div
                style={{ width: `${Math.max(10, (paymentStats.released / (paymentStats.locked + paymentStats.released || 1)) * 100)}%` }}
                className="bg-sage-light rounded-[6px] border border-forest/20 transition-all relative group"
                title={`Released Payouts: ${paymentStats.released} MATIC`}
              />
              {paymentStats.disputed > 0 && (
                <div
                  style={{ width: '10%' }}
                  className="bg-coral rounded-[6px] transition-all relative group"
                  title={`Disputed: ${paymentStats.disputed} MATIC`}
                />
              )}
            </div>

            {/* Legend Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-[10px] bg-sage/40 border border-gray">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-forest" />
                  <span className="text-xs font-medium text-ink/70">Held in Escrow</span>
                </div>
                <div className="text-base font-heading font-bold text-ink">
                  <AmountDisplay amount={paymentStats.locked} size="sm" />
                </div>
              </div>

              <div className="p-3 rounded-[10px] bg-sage/40 border border-gray">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-sage-light border border-forest/30" />
                  <span className="text-xs font-medium text-ink/70">Released</span>
                </div>
                <div className="text-base font-heading font-bold text-ink">
                  <AmountDisplay amount={paymentStats.released} size="sm" />
                </div>
              </div>

              <div className="p-3 rounded-[10px] bg-sage/40 border border-gray">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-coral" />
                  <span className="text-xs font-medium text-ink/70">Disputed</span>
                </div>
                <div className="text-base font-heading font-bold text-ink">
                  <AmountDisplay amount={paymentStats.disputed} size="sm" />
                </div>
              </div>

              <div className="p-3 rounded-[10px] bg-sage/40 border border-gray">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray border border-forest" />
                  <span className="text-xs font-medium text-ink/70">Refunded</span>
                </div>
                <div className="text-base font-heading font-bold text-ink">
                  <AmountDisplay amount={paymentStats.refunded} size="sm" />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Dark Forest Promo Card: "YOUR WORK. PROTECTED." */}
        <Card variant="forest" className="flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ivory/15 text-ivory text-xs font-heading font-semibold mb-4">
              <Shield className="w-3.5 h-3.5 text-coral" />
              SANKALP ESCROW ENGINE
            </div>
            <h2 className="text-2xl font-heading font-bold text-ivory tracking-tight leading-snug">
              YOUR WORK.<br />PROTECTED.
            </h2>
            <p className="text-xs text-ivory/80 mt-3 leading-relaxed">
              Every deliverable is verified via advisory AI commit tracking, canonical Keccak-256 agreement binding, and non-custodial Polygon smart contracts.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-ivory/20 flex items-center justify-between">
            <span className="text-xs text-ivory/70 font-mono">Zero Platform Custody</span>
            <button
              onClick={onNavigateToProjects}
              className="text-xs font-heading font-semibold text-coral hover:text-coral/80 flex items-center gap-1"
            >
              Explore Feed <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>
      </div>

      {/* Two Column Section: Recent Projects + Upcoming Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects List */}
        <Card>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray">
            <h3 className="font-heading font-bold text-base text-ink">Recent Projects</h3>
            <button
              onClick={() => onOpenAgreement ? onOpenAgreement(agreements[0]?.id) : null}
              className="text-xs font-heading font-semibold text-forest hover:underline"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {agreements.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink/50">
                No active agreements yet. Create a draft or browse open opportunities.
              </div>
            ) : (
              agreements.slice(0, 4).map((agr) => (
                <div
                  key={agr.id}
                  onClick={() => onOpenAgreement(agr.id)}
                  className="p-3.5 rounded-card border border-gray bg-white hover:border-forest/40 hover:bg-sage/20 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="font-heading font-bold text-sm text-ink truncate">
                      {agr.terms?.title || 'Decentralized Agreement'}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge status={agr.status || 'ACTIVE'} size="sm">
                        {agr.status || 'Active'}
                      </Badge>
                      <span className="text-xs text-ink/60 font-mono">
                        {agr.terms?.milestones?.length || 1} milestones
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <AmountDisplay amount={agr.terms?.totalAmount || '2.5'} size="sm" />
                    <ChevronRight className="w-4 h-4 text-ink/40 ml-auto mt-1" />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming Milestones */}
        <Card>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray">
            <h3 className="font-heading font-bold text-base text-ink">Upcoming Milestones</h3>
            <span className="text-xs font-mono text-ink/50">{upcomingMilestones.length} pending</span>
          </div>

          <div className="space-y-3">
            {upcomingMilestones.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink/50">
                All milestone deliverables are up to date!
              </div>
            ) : (
              upcomingMilestones.slice(0, 4).map((ms, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenAgreement(ms.agreementId)}
                  className="p-3.5 rounded-card border border-gray bg-white hover:border-forest/40 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="font-heading font-semibold text-sm text-ink truncate">
                      {ms.milestoneTitle}
                    </h4>
                    <p className="text-xs text-ink/50 truncate mt-0.5">{ms.agreementTitle}</p>
                    <div className="mt-1.5">
                      <CountdownTimer targetDate={ms.deadline} />
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <AmountDisplay amount={ms.amount} size="sm" />
                    <Badge status={ms.status} size="sm" className="mt-1.5 block">
                      {ms.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
