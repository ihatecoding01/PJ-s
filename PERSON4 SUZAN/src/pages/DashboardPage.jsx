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
  CreditCard,
  DollarSign,
  Send,
  Eye,
  Star,
  Zap,
  Target,
  Award,
  FileCheck2,
  Users
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

  const role = (user?.role || 'CLIENT').toUpperCase();
  const isClient = role === 'CLIENT';
  const isFreelancer = role === 'FREELANCER';

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
  const activeCount = agreements.filter(a => {
    const s = (a.status || '').toUpperCase();
    return s === 'ACTIVE' || s === 'AWAITING_FUNDING' || s === 'AWAITINGFUNDING';
  }).length;
  const completedCount = agreements.filter(a => (a.status || '').toUpperCase() === 'COMPLETED').length;
  const disputedCount = agreements.filter(a => (a.status || '').toUpperCase() === 'DISPUTED').length;
  const draftCount = agreements.filter(a => (a.status || '').toUpperCase() === 'DRAFT').length;
  const pendingPaymentsEth = paymentStats.locked || 2.5;

  // Derive upcoming milestones from agreements
  const upcomingMilestones = [];
  const milestonesAwaitingReview = [];
  const milestonesToSubmit = [];

  agreements.forEach(agr => {
    const msList = agr.milestones || agr.terms?.milestones || [];
    msList.forEach((m, idx) => {
      const msStatus = (m.status || '').toUpperCase();
      const msDeadline = m.deadline || agr.terms?.milestones?.[idx]?.deadline;

      if (msStatus === 'SUBMITTED') {
        milestonesAwaitingReview.push({
          agreementId: agr.id,
          agreementTitle: agr.terms?.title,
          milestoneTitle: m.title || agr.terms?.milestones?.[idx]?.title || `Milestone ${idx + 1}`,
          amount: m.amount || agr.terms?.milestones?.[idx]?.amount,
          deadline: msDeadline,
          status: 'SUBMITTED',
          index: idx,
        });
      }

      if (msStatus === 'PENDING' && (agr.status || '').toUpperCase() === 'ACTIVE') {
        milestonesToSubmit.push({
          agreementId: agr.id,
          agreementTitle: agr.terms?.title,
          milestoneTitle: m.title || agr.terms?.milestones?.[idx]?.title || `Milestone ${idx + 1}`,
          amount: m.amount || agr.terms?.milestones?.[idx]?.amount,
          deadline: msDeadline,
          status: 'PENDING',
          index: idx,
        });
      }

      if (msDeadline && (msStatus === 'PENDING' || msStatus === 'SUBMITTED')) {
        upcomingMilestones.push({
          agreementId: agr.id,
          agreementTitle: agr.terms?.title,
          milestoneTitle: m.title || agr.terms?.milestones?.[idx]?.title || `Milestone ${idx + 1}`,
          amount: m.amount || agr.terms?.milestones?.[idx]?.amount,
          deadline: msDeadline,
          status: msStatus || 'PENDING',
        });
      }
    });
  });

  // Compute earnings for freelancer
  let totalEarned = 0;
  let totalPending = 0;
  agreements.forEach(agr => {
    const msList = agr.milestones || [];
    msList.forEach(m => {
      const msStatus = (m.status || '').toUpperCase();
      if (msStatus === 'PAID' || msStatus === 'APPROVED') {
        totalEarned += parseFloat(m.paid || m.amount || '0');
      } else if (msStatus === 'SUBMITTED') {
        totalPending += parseFloat(m.amount || '0');
      }
    });
  });

  // Compute total spent for client
  let totalSpent = totalEarned; // mirror
  let totalInEscrow = paymentStats.locked;

  const greetingName = user?.name ? user.name.split(' ')[0] : 'Partner';

  // ─── CLIENT DASHBOARD ────────────────────────────────────────────
  if (isClient) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
              Welcome back, {greetingName}
            </h1>
            <p className="text-sm text-ink/60 mt-1">
              Manage your commissioned projects, review deliverables, and track escrow settlements.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sage/50 border border-gray text-xs font-heading font-medium text-forest">
              <Users className="w-3.5 h-3.5" />
              Client Dashboard
            </div>
            <Button variant="primary" onClick={onOpenCreateProject}>
              + Post a Job
            </Button>
          </div>
        </div>

        {/* Client Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:border-forest/40 transition-all">
            <div className="flex items-center justify-between text-ink/60 mb-2">
              <span className="text-xs font-heading font-semibold uppercase tracking-wider">Commissioned Projects</span>
              <div className="w-8 h-8 rounded-[8px] bg-sage flex items-center justify-center text-forest">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-heading font-bold text-ink tabular-nums">
              {activeCount}
            </div>
            <p className="text-xs text-forest mt-1.5 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Active & funded on-chain
            </p>
          </Card>

          <Card className="hover:border-forest/40 transition-all">
            <div className="flex items-center justify-between text-ink/60 mb-2">
              <span className="text-xs font-heading font-semibold uppercase tracking-wider">Escrow Locked</span>
              <div className="w-8 h-8 rounded-[8px] bg-sage flex items-center justify-center text-forest">
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-heading font-bold text-ink tabular-nums">
              <AmountDisplay amount={totalInEscrow} size="xl" />
            </div>
            <p className="text-xs text-ink/60 mt-1.5 font-medium">
              Funds secured in smart contract
            </p>
          </Card>

          <Card className="hover:border-forest/40 transition-all">
            <div className="flex items-center justify-between text-ink/60 mb-2">
              <span className="text-xs font-heading font-semibold uppercase tracking-wider">Total Settled</span>
              <div className="w-8 h-8 rounded-[8px] bg-sage flex items-center justify-center text-forest">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-heading font-bold text-ink tabular-nums">
              <AmountDisplay amount={paymentStats.released} size="xl" />
            </div>
            <p className="text-xs text-forest mt-1.5 font-medium">
              {completedCount} projects completed
            </p>
          </Card>

          <Card className="hover:border-forest/40 transition-all">
            <div className="flex items-center justify-between text-ink/60 mb-2">
              <span className="text-xs font-heading font-semibold uppercase tracking-wider">Pending Reviews</span>
              <div className="w-8 h-8 rounded-[8px] bg-coral/20 flex items-center justify-center">
                <Eye className="w-4 h-4 text-coral" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-heading font-bold text-ink tabular-nums">
              {milestonesAwaitingReview.length}
            </div>
            <p className="text-xs text-coral mt-1.5 font-medium">
              Milestones awaiting your approval
            </p>
          </Card>
        </div>

        {/* Client Escrow Overview + Promo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between pb-4 border-b border-gray mb-5">
              <div>
                <h3 className="font-heading font-bold text-base text-ink">Spending & Escrow Overview</h3>
                <p className="text-xs text-ink/60 mt-0.5">Capital allocation across your commissioned projects</p>
              </div>
              <span className="text-xs font-mono font-medium text-forest bg-sage px-2.5 py-1 rounded-full">
                Client Ledger
              </span>
            </div>

            <div className="space-y-4">
              <div className="h-6 w-full bg-gray/60 rounded-[8px] flex overflow-hidden p-0.5 gap-0.5">
                <div
                  style={{ width: `${Math.max(15, (paymentStats.locked / (paymentStats.locked + paymentStats.released || 1)) * 100)}%` }}
                  className="bg-forest rounded-[6px] transition-all"
                  title={`Locked in Escrow: ${paymentStats.locked} ETH`}
                />
                <div
                  style={{ width: `${Math.max(10, (paymentStats.released / (paymentStats.locked + paymentStats.released || 1)) * 100)}%` }}
                  className="bg-sage-light rounded-[6px] border border-forest/20 transition-all"
                  title={`Released to Freelancers: ${paymentStats.released} ETH`}
                />
                {paymentStats.disputed > 0 && (
                  <div
                    style={{ width: '10%' }}
                    className="bg-coral rounded-[6px] transition-all"
                    title={`Disputed: ${paymentStats.disputed} ETH`}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-[10px] bg-sage/40 border border-gray">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-forest" />
                    <span className="text-xs font-medium text-ink/70">In Escrow</span>
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
                    <span className="text-xs font-medium text-ink/70">Fees Paid</span>
                  </div>
                  <div className="text-base font-heading font-bold text-ink">
                    <AmountDisplay amount={paymentStats.feesPaid} size="sm" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card variant="forest" className="flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ivory/15 text-ivory text-xs font-heading font-semibold mb-4">
                <Shield className="w-3.5 h-3.5 text-coral" />
                CLIENT PROTECTION
              </div>
              <h2 className="text-2xl font-heading font-bold text-ivory tracking-tight leading-snug">
                YOUR FUNDS.<br />PROTECTED.
              </h2>
              <p className="text-xs text-ivory/80 mt-3 leading-relaxed">
                Escrow is released only after AI-verified deliverables pass your review. You retain full control over milestone approvals.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-ivory/20 flex items-center justify-between">
              <span className="text-xs text-ivory/70 font-mono">Non-Custodial Escrow</span>
              <button
                onClick={onNavigateToProjects}
                className="text-xs font-heading font-semibold text-coral hover:text-coral/80 flex items-center gap-1"
              >
                Find Talent <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        </div>

        {/* Milestones Awaiting Review + Recent Projects */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Milestones to Review (Client-specific) */}
          <Card>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray">
              <h3 className="font-heading font-bold text-base text-ink flex items-center gap-2">
                <Eye className="w-4 h-4 text-coral" />
                Deliverables to Review
              </h3>
              <span className="text-xs font-mono text-ink/50">{milestonesAwaitingReview.length} pending</span>
            </div>

            <div className="space-y-3">
              {milestonesAwaitingReview.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink/50">
                  No submitted milestones are waiting for your review.
                </div>
              ) : (
                milestonesAwaitingReview.slice(0, 4).map((ms, idx) => (
                  <div
                    key={idx}
                    onClick={() => onOpenAgreement(ms.agreementId)}
                    className="p-3.5 rounded-card border border-coral/30 bg-coral/5 hover:border-coral/50 hover:bg-coral/10 transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <h4 className="font-heading font-semibold text-sm text-ink truncate">
                        {ms.milestoneTitle}
                      </h4>
                      <p className="text-xs text-ink/50 truncate mt-0.5">{ms.agreementTitle}</p>
                      {ms.deadline && (
                        <div className="mt-1.5">
                          <CountdownTimer targetDate={ms.deadline} />
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <AmountDisplay amount={ms.amount} size="sm" />
                      <Badge status="SUBMITTED" size="sm" className="mt-1.5 block">
                        Needs Review
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Recent Projects */}
          <Card>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray">
              <h3 className="font-heading font-bold text-base text-ink">Commissioned Projects</h3>
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
                  No projects commissioned yet. Post a job to get started.
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
        </div>
      </div>
    );
  }

  // ─── FREELANCER DASHBOARD ────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
            Welcome back, {greetingName}
          </h1>
          <p className="text-sm text-ink/60 mt-1">
            Track your active gigs, submit deliverables, and monitor your earnings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sage/50 border border-gray text-xs font-heading font-medium text-forest">
            <Zap className="w-3.5 h-3.5" />
            Freelancer Dashboard
          </div>
          <Button variant="primary" onClick={onNavigateToProjects}>
            Find Work
          </Button>
        </div>
      </div>

      {/* Freelancer Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-forest/40 transition-all">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider">Active Gigs</span>
            <div className="w-8 h-8 rounded-[8px] bg-sage flex items-center justify-center text-forest">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-heading font-bold text-ink tabular-nums">
            {activeCount}
          </div>
          <p className="text-xs text-forest mt-1.5 flex items-center gap-1 font-medium">
            <Zap className="w-3.5 h-3.5" /> In progress
          </p>
        </Card>

        <Card className="hover:border-forest/40 transition-all">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider">Total Earned</span>
            <div className="w-8 h-8 rounded-[8px] bg-sage flex items-center justify-center text-forest">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-heading font-bold text-forest tabular-nums">
            <AmountDisplay amount={totalEarned} size="xl" />
          </div>
          <p className="text-xs text-forest mt-1.5 font-medium">
            From {completedCount + (totalEarned > 0 ? 1 : 0)} completed milestones
          </p>
        </Card>

        <Card className="hover:border-forest/40 transition-all">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider">Pending Payout</span>
            <div className="w-8 h-8 rounded-[8px] bg-sage flex items-center justify-center text-forest">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-heading font-bold text-ink tabular-nums">
            <AmountDisplay amount={totalPending} size="xl" />
          </div>
          <p className="text-xs text-ink/60 mt-1.5 font-medium">
            Awaiting client review & approval
          </p>
        </Card>

        <Card className="hover:border-forest/40 transition-all">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider">To Submit</span>
            <div className="w-8 h-8 rounded-[8px] bg-coral/20 flex items-center justify-center">
              <Send className="w-4 h-4 text-coral" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-heading font-bold text-ink tabular-nums">
            {milestonesToSubmit.length}
          </div>
          <p className="text-xs text-coral mt-1.5 font-medium">
            Milestones ready for submission
          </p>
        </Card>
      </div>

      {/* Earnings Breakdown + Promo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-gray mb-5">
            <div>
              <h3 className="font-heading font-bold text-base text-ink">Earnings Breakdown</h3>
              <p className="text-xs text-ink/60 mt-0.5">Your verified milestone earnings and pending payouts</p>
            </div>
            <span className="text-xs font-mono font-medium text-forest bg-sage px-2.5 py-1 rounded-full">
              Freelancer Ledger
            </span>
          </div>

          <div className="space-y-4">
            <div className="h-6 w-full bg-gray/60 rounded-[8px] flex overflow-hidden p-0.5 gap-0.5">
              {totalEarned > 0 && (
                <div
                  style={{ width: `${Math.max(15, (totalEarned / (totalEarned + totalPending + pendingPaymentsEth || 1)) * 100)}%` }}
                  className="bg-forest rounded-[6px] transition-all"
                  title={`Earned: ${totalEarned.toFixed(3)} ETH`}
                />
              )}
              {totalPending > 0 && (
                <div
                  style={{ width: `${Math.max(10, (totalPending / (totalEarned + totalPending + pendingPaymentsEth || 1)) * 100)}%` }}
                  className="bg-amber-400 rounded-[6px] transition-all"
                  title={`Pending Review: ${totalPending} ETH`}
                />
              )}
              <div
                style={{ width: `${Math.max(10, (pendingPaymentsEth / (totalEarned + totalPending + pendingPaymentsEth || 1)) * 100)}%` }}
                className="bg-sage-light rounded-[6px] border border-forest/20 transition-all"
                title={`In Escrow (to be earned): ${pendingPaymentsEth} ETH`}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-[10px] bg-sage/40 border border-gray">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-forest" />
                  <span className="text-xs font-medium text-ink/70">Earned</span>
                </div>
                <div className="text-base font-heading font-bold text-forest">
                  <AmountDisplay amount={totalEarned} size="sm" />
                </div>
              </div>

              <div className="p-3 rounded-[10px] bg-sage/40 border border-gray">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-xs font-medium text-ink/70">Under Review</span>
                </div>
                <div className="text-base font-heading font-bold text-ink">
                  <AmountDisplay amount={totalPending} size="sm" />
                </div>
              </div>

              <div className="p-3 rounded-[10px] bg-sage/40 border border-gray">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-sage-light border border-forest/30" />
                  <span className="text-xs font-medium text-ink/70">In Escrow</span>
                </div>
                <div className="text-base font-heading font-bold text-ink">
                  <AmountDisplay amount={pendingPaymentsEth} size="sm" />
                </div>
              </div>

              <div className="p-3 rounded-[10px] bg-sage/40 border border-gray">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-forest/60" />
                  <span className="text-xs font-medium text-ink/70">Completed</span>
                </div>
                <div className="text-base font-heading font-bold text-ink">
                  {completedCount} projects
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="forest" className="flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ivory/15 text-ivory text-xs font-heading font-semibold mb-4">
              <Award className="w-3.5 h-3.5 text-coral" />
              FREELANCER SHIELD
            </div>
            <h2 className="text-2xl font-heading font-bold text-ivory tracking-tight leading-snug">
              YOUR WORK.<br />PROTECTED.
            </h2>
            <p className="text-xs text-ivory/80 mt-3 leading-relaxed">
              Every deliverable is verified via AI commit tracking and canonical hashing. Clients can't dispute without evidence — and late reviews auto-approve your work.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-ivory/20 flex items-center justify-between">
            <span className="text-xs text-ivory/70 font-mono">Auto-Approve on Silence</span>
            <button
              onClick={onNavigateToProjects}
              className="text-xs font-heading font-semibold text-coral hover:text-coral/80 flex items-center gap-1"
            >
              Browse Gigs <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>
      </div>

      {/* Milestones to Submit + Active Gigs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Milestones to Submit (Freelancer-specific) */}
        <Card>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray">
            <h3 className="font-heading font-bold text-base text-ink flex items-center gap-2">
              <Send className="w-4 h-4 text-coral" />
              Milestones to Deliver
            </h3>
            <span className="text-xs font-mono text-ink/50">{milestonesToSubmit.length} pending</span>
          </div>

          <div className="space-y-3">
            {milestonesToSubmit.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink/50">
                All milestones are up to date! Browse gigs for new opportunities.
              </div>
            ) : (
              milestonesToSubmit.slice(0, 4).map((ms, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenAgreement(ms.agreementId)}
                  className="p-3.5 rounded-card border border-forest/30 bg-sage/10 hover:border-forest/50 hover:bg-sage/20 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="font-heading font-semibold text-sm text-ink truncate">
                      {ms.milestoneTitle}
                    </h4>
                    <p className="text-xs text-ink/50 truncate mt-0.5">{ms.agreementTitle}</p>
                    {ms.deadline && (
                      <div className="mt-1.5">
                        <CountdownTimer targetDate={ms.deadline} />
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <AmountDisplay amount={ms.amount} size="sm" />
                    <Badge status="PENDING" size="sm" className="mt-1.5 block">
                      Submit Work
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Active Gigs List */}
        <Card>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray">
            <h3 className="font-heading font-bold text-base text-ink">Active Gigs</h3>
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
                No active gigs yet. Browse the project feed for opportunities.
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
      </div>
    </div>
  );
}
