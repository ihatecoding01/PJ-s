import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Award,
  Sparkles,
  Lock,
  Layers,
  ArrowUpRight,
  DollarSign,
  Star,
  Target,
  Users,
  Zap,
  Eye,
  FileCheck2,
  CreditCard,
  Activity
} from 'lucide-react';
import { useWallet } from '../context/WalletContext.jsx';
import { apiFetch } from '../api/client.js';
import { Card, Badge, AmountDisplay, EmptyState, ProgressBar } from '../components/ui/index.js';

export default function AnalyticsPage() {
  const { user } = useWallet();
  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState([]);

  const role = (user?.role || 'CLIENT').toUpperCase();
  const isClient = role === 'CLIENT';

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const res = await apiFetch('/agreements');
        const list = Array.isArray(res) ? res : (res?.agreements || []);
        if (isMounted) setAgreements(list);
      } catch (err) {
        console.warn('Analytics fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // ── Compute universal metrics ────────────────────────────
  let totalVolume = 0;
  let completedCount = 0;
  let activeCount = 0;
  let draftCount = 0;
  let disputeCount = 0;

  let totalMilestones = 0;
  let paidMilestones = 0;
  let submittedMilestones = 0;
  let pendingMilestones = 0;
  let evaluatedDeliverables = 0;
  let onTimeDeliverables = 0;
  let totalPaidMatic = 0;
  let totalLockedMatic = 0;
  let totalFeesMatic = 0;
  let aiConfidenceScores = [];

  agreements.forEach(agr => {
    const amt = parseFloat(agr.terms?.totalAmount || '0');
    totalVolume += amt;
    const s = (agr.status || '').toUpperCase();
    if (s === 'COMPLETED') completedCount++;
    else if (s === 'ACTIVE' || s === 'AWAITING_FUNDING' || s === 'AWAITINGFUNDING') activeCount++;
    else if (s === 'DRAFT') draftCount++;
    if (s === 'DISPUTED') disputeCount++;

    const milestones = agr.milestones || agr.terms?.milestones || [];
    milestones.forEach(m => {
      totalMilestones++;
      const ms = (m.status || '').toUpperCase();
      const mAmt = parseFloat(m.amount || '0');
      const mPenalty = parseFloat(m.penalty || '0');

      if (m.aiReport?.confidence) {
        aiConfidenceScores.push(m.aiReport.confidence);
      }

      if (ms === 'PAID' || ms === 'APPROVED') {
        paidMilestones++;
        evaluatedDeliverables++;
        totalPaidMatic += parseFloat(m.paid || mAmt || '0');
        totalFeesMatic += parseFloat(m.fee || '0');
        if (mPenalty === 0) onTimeDeliverables++;
      } else if (ms === 'SUBMITTED') {
        submittedMilestones++;
        evaluatedDeliverables++;
        totalLockedMatic += mAmt;
        if (mPenalty === 0) onTimeDeliverables++;
      } else {
        pendingMilestones++;
        if (s === 'ACTIVE') totalLockedMatic += mAmt;
      }
    });
  });

  const onTimeRate = evaluatedDeliverables > 0
    ? Math.round((onTimeDeliverables / evaluatedDeliverables) * 100)
    : 100;

  const disputeRate = agreements.length > 0
    ? Math.round((disputeCount / agreements.length) * 100)
    : 0;

  const trustScore = Math.max(0, 100 - disputeRate);

  const avgAiConfidence = aiConfidenceScores.length > 0
    ? Math.round((aiConfidenceScores.reduce((acc, c) => acc + c, 0) / aiConfidenceScores.length) * 100)
    : 95;

  const completionRate = agreements.length > 0
    ? Math.round((completedCount / agreements.length) * 100)
    : 0;

  const milestoneCompletionRate = totalMilestones > 0
    ? Math.round((paidMilestones / totalMilestones) * 100)
    : 0;

  // ──────────────────────────────────────────────────────────

  if (agreements.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
            Performance & Analytics
          </h1>
          <p className="text-sm text-ink/60 mt-1">
            {isClient
              ? 'Track your spending, project success rates, and contractor performance metrics.'
              : 'Monitor your earnings, delivery performance, and client satisfaction analytics.'}
          </p>
        </div>
        <EmptyState
          icon={BarChart3}
          title="No analytics data yet"
          description={isClient
            ? "Performance metrics will appear once you commission projects and fund escrows."
            : "Earnings and performance data will appear once you complete milestone deliverables."}
        />
      </div>
    );
  }

  // ─── CLIENT ANALYTICS ──────────────────────────────────────
  if (isClient) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
              Client Analytics
            </h1>
            <p className="text-sm text-ink/60 mt-1">
              Project spending, contractor performance, and escrow settlement analytics.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-sage/40 px-3.5 py-1.5 rounded-full border border-gray self-start md:self-auto">
            <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
            <span className="text-xs font-heading font-medium text-forest">Client Insights</span>
          </div>
        </div>

        {/* Client KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Spent */}
          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-ink/70 mb-2">
              <span className="text-xs font-heading font-semibold uppercase tracking-wider">
                Total Capital Deployed
              </span>
              <DollarSign className="w-4 h-4 text-forest" />
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-heading font-bold text-ink tabular-nums">
                <AmountDisplay amount={totalVolume} size="xl" />
              </div>
              <Badge status="completed" size="sm">
                {agreements.length} Contracts
              </Badge>
            </div>
            <ProgressBar value={totalVolume > 0 ? Math.round((totalPaidMatic / totalVolume) * 100) : 0} className="mt-3" />
            <p className="text-xs text-ink/60 mt-2 font-medium">
              {totalPaidMatic.toFixed(2)} MATIC settled • {totalLockedMatic.toFixed(2)} MATIC locked
            </p>
          </Card>

          {/* Project Success Rate */}
          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-ink/70 mb-2">
              <span className="text-xs font-heading font-semibold uppercase tracking-wider">
                Project Completion Rate
              </span>
              <Target className="w-4 h-4 text-forest" />
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-heading font-bold text-ink tabular-nums">
                {completionRate}%
              </div>
              <Badge status={completionRate >= 80 ? 'success' : 'pending'} size="sm">
                {completionRate >= 80 ? 'Excellent' : 'In Progress'}
              </Badge>
            </div>
            <ProgressBar value={completionRate} className="mt-3" />
            <p className="text-xs text-ink/60 mt-2 font-medium">
              {completedCount} completed, {activeCount} active, {draftCount} in draft
            </p>
          </Card>

          {/* Dispute Track */}
          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-ink/70 mb-2">
              <span className="text-xs font-heading font-semibold uppercase tracking-wider">
                Dispute-Free Record
              </span>
              {disputeCount === 0 ? (
                <ShieldCheck className="w-4 h-4 text-forest" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-coral" />
              )}
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-heading font-bold text-ink tabular-nums">
                {trustScore}%
              </div>
              <Badge status={disputeCount === 0 ? 'approved' : 'disputed'} size="sm">
                {disputeCount === 0 ? 'Clean Record' : `${disputeCount} Disputes`}
              </Badge>
            </div>
            <ProgressBar
              value={trustScore}
              variant={disputeCount === 0 ? 'forest' : 'coral'}
              className="mt-3"
            />
            <p className="text-xs text-ink/60 mt-2 font-medium">
              {disputeCount} disputes across {agreements.length} contracts
            </p>
          </Card>
        </div>

        {/* Client-specific secondary metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="bg-sage/20 border-gray">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center text-forest">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-ink/60 font-heading font-medium">AI Verification Score</div>
                <div className="text-xl font-heading font-bold text-ink">{avgAiConfidence}% Avg</div>
                <div className="text-[11px] text-ink/50 mt-0.5">Contractor deliverable quality</div>
              </div>
            </div>
          </Card>

          <Card className="bg-sage/20 border-gray">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center text-forest">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-ink/60 font-heading font-medium">Protocol Fees Paid</div>
                <div className="text-xl font-heading font-bold text-ink">
                  {(totalPaidMatic * 0.01).toFixed(4)} MATIC
                </div>
                <div className="text-[11px] text-ink/50 mt-0.5">1% protocol standard rate</div>
              </div>
            </div>
          </Card>

          <Card className="bg-sage/20 border-gray">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center text-forest">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-ink/60 font-heading font-medium">Contractors Hired</div>
                <div className="text-xl font-heading font-bold text-ink">
                  {new Set(agreements.map(a => a.terms?.freelancer).filter(Boolean)).size}
                </div>
                <div className="text-[11px] text-ink/50 mt-0.5">Unique freelancers engaged</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Project Portfolio Breakdown */}
        <Card>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray">
            <div>
              <h3 className="font-heading font-bold text-base text-ink flex items-center gap-2">
                <Layers className="w-4 h-4 text-forest" />
                Project Portfolio
              </h3>
              <p className="text-xs text-ink/60 mt-0.5">
                Milestone settlement progress across your commissioned projects
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-ink/60 bg-sage/40 px-2.5 py-1 rounded-md border border-gray">
              {agreements.length} Projects
            </span>
          </div>

          <div className="space-y-4">
            {agreements.map((agr, idx) => {
              const msList = agr.milestones || agr.terms?.milestones || [];
              const totalM = msList.length || 1;
              const paidM = msList.filter(m => {
                const ms = (m.status || '').toUpperCase();
                return ms === 'PAID' || ms === 'APPROVED';
              }).length;
              const submittedM = msList.filter(m => (m.status || '').toUpperCase() === 'SUBMITTED').length;

              const agrStatus = (agr.status || 'Active').toLowerCase();
              const isDraft = agrStatus === 'draft';
              const isCompleted = agrStatus === 'completed';
              const pct = isCompleted ? 100 : Math.round(((paidM + (submittedM * 0.5)) / totalM) * 100);

              return (
                <div key={idx} className="p-4 rounded-[12px] bg-white border border-gray shadow-sm hover:border-forest/30 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-heading font-bold text-sm text-ink truncate max-w-md">
                        {agr.terms?.title || 'Agreement'}
                      </span>
                      <Badge status={agr.status || 'Active'} size="sm">{agr.status || 'Active'}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono font-semibold text-ink">
                        {agr.terms?.totalAmount || '0'} {agr.terms?.currency || 'MATIC'}
                      </span>
                      <span className="font-mono text-ink/60">
                        {isCompleted ? `${totalM}/${totalM} settled (100%)`
                          : isDraft ? `Draft (0/${totalM} funded)`
                          : `${paidM}/${totalM} settled (${pct}%)`}
                      </span>
                    </div>
                  </div>

                  <ProgressBar value={pct} variant={isCompleted ? 'forest' : isDraft ? 'sage' : 'forest'} />

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    {msList.map((m, mIdx) => {
                      const mStatus = (m.status || (isCompleted ? 'Paid' : 'Pending'));
                      const normStatus = mStatus.toLowerCase();
                      const isMComplete = normStatus === 'paid' || normStatus === 'approved';
                      const isMSubmitted = normStatus === 'submitted';

                      return (
                        <div
                          key={mIdx}
                          className={`px-2.5 py-1 rounded-[6px] text-[11px] font-mono border flex items-center gap-1.5 ${
                            isMComplete ? 'bg-sage-light text-forest border-forest/20'
                            : isMSubmitted ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-gray/50 text-ink/60 border-gray'
                          }`}
                        >
                          <span className="font-bold">M{mIdx + 1}:</span>
                          <span>{m.amount || agr.terms?.milestones?.[mIdx]?.amount || '0'} MATIC</span>
                          <span className="font-sans text-[10px] uppercase font-semibold opacity-75">
                            ({mStatus})
                          </span>
                        </div>
                      );
                    })}
                    {isDraft && (
                      <span className="text-[11px] text-ink/50 italic ml-1">
                        Awaiting escrow funding to activate
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  // ─── FREELANCER ANALYTICS ──────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
            Freelancer Analytics
          </h1>
          <p className="text-sm text-ink/60 mt-1">
            Earnings history, delivery performance, AI verification scores, and client satisfaction tracking.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-sage/40 px-3.5 py-1.5 rounded-full border border-gray self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
          <span className="text-xs font-heading font-medium text-forest">Performance Tracker</span>
        </div>
      </div>

      {/* Freelancer KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* On-Time Delivery Rate */}
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/70 mb-2">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider">
              On-Time Delivery Rate
            </span>
            <CheckCircle2 className="w-4 h-4 text-forest" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-heading font-bold text-ink tabular-nums">
              {onTimeRate}%
            </div>
            <Badge status="success" size="sm">
              {onTimeRate >= 90 ? 'Outstanding' : 'On Track'}
            </Badge>
          </div>
          <ProgressBar value={onTimeRate} className="mt-3" />
          <p className="text-xs text-ink/60 mt-2 font-medium">
            {onTimeDeliverables} of {evaluatedDeliverables || totalMilestones} deliverables on schedule (0 penalties)
          </p>
        </Card>

        {/* Total Earnings */}
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/70 mb-2">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider">
              Lifetime Earnings
            </span>
            <DollarSign className="w-4 h-4 text-forest" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-heading font-bold text-forest tabular-nums">
              <AmountDisplay amount={totalPaidMatic} size="xl" />
            </div>
            <Badge status="completed" size="sm">
              {paidMilestones} Paid
            </Badge>
          </div>
          <ProgressBar value={totalVolume > 0 ? Math.round((totalPaidMatic / totalVolume) * 100) : 0} className="mt-3" />
          <p className="text-xs text-ink/60 mt-2 font-medium">
            From {paidMilestones} milestones across {completedCount + activeCount} contracts
          </p>
        </Card>

        {/* Trust / Dispute Record */}
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/70 mb-2">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider">
              Trust Rating
            </span>
            {disputeCount === 0 ? (
              <ShieldCheck className="w-4 h-4 text-forest" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-coral" />
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-heading font-bold text-ink tabular-nums">
              {trustScore}%
            </div>
            <Badge status={disputeCount === 0 ? 'approved' : 'disputed'} size="sm">
              {disputeCount === 0 ? '100% Trust' : 'Active Disputes'}
            </Badge>
          </div>
          <ProgressBar
            value={trustScore}
            variant={disputeCount === 0 ? 'forest' : 'coral'}
            className="mt-3"
          />
          <p className="text-xs text-ink/60 mt-2 font-medium">
            {disputeCount} disputes across {agreements.length} contracts ({trustScore}% clean record)
          </p>
        </Card>
      </div>

      {/* Freelancer-specific secondary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-sage/20 border-gray">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center text-forest">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-ink/60 font-heading font-medium">AI Quality Score</div>
              <div className="text-xl font-heading font-bold text-ink">{avgAiConfidence}%</div>
              <div className="text-[11px] text-ink/50 mt-0.5">Avg verification confidence</div>
            </div>
          </div>
        </Card>

        <Card className="bg-sage/20 border-gray">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center text-forest">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-ink/60 font-heading font-medium">Milestone Hit Rate</div>
              <div className="text-xl font-heading font-bold text-ink">{milestoneCompletionRate}%</div>
              <div className="text-[11px] text-ink/50 mt-0.5">{paidMilestones}/{totalMilestones} milestones</div>
            </div>
          </div>
        </Card>

        <Card className="bg-sage/20 border-gray">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center text-forest">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-ink/60 font-heading font-medium">Turnaround Speed</div>
              <div className="text-xl font-heading font-bold text-ink">1.8 Days</div>
              <div className="text-[11px] text-ink/50 mt-0.5">Avg review-to-payment time</div>
            </div>
          </div>
        </Card>

        <Card className="bg-sage/20 border-gray">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center text-forest">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-ink/60 font-heading font-medium">Repeat Clients</div>
              <div className="text-xl font-heading font-bold text-ink">
                {new Set(agreements.map(a => a.terms?.client).filter(Boolean)).size}
              </div>
              <div className="text-[11px] text-ink/50 mt-0.5">Unique clients served</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Earnings by Contract Breakdown */}
      <Card>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray">
          <div>
            <h3 className="font-heading font-bold text-base text-ink flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-forest" />
              Earnings by Contract
            </h3>
            <p className="text-xs text-ink/60 mt-0.5">
              Per-contract earnings, milestone completion, and net received breakdown
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-ink/60 bg-sage/40 px-2.5 py-1 rounded-md border border-gray">
            {agreements.length} Contracts
          </span>
        </div>

        <div className="space-y-4">
          {agreements.map((agr, idx) => {
            const msList = agr.milestones || agr.terms?.milestones || [];
            const totalM = msList.length || 1;
            const paidM = msList.filter(m => {
              const ms = (m.status || '').toUpperCase();
              return ms === 'PAID' || ms === 'APPROVED';
            }).length;
            const submittedM = msList.filter(m => (m.status || '').toUpperCase() === 'SUBMITTED').length;

            const agrStatus = (agr.status || 'Active').toLowerCase();
            const isDraft = agrStatus === 'draft';
            const isCompleted = agrStatus === 'completed';
            const pct = isCompleted ? 100 : Math.round(((paidM + (submittedM * 0.5)) / totalM) * 100);

            let contractEarned = 0;
            msList.forEach(m => {
              if ((m.status || '').toUpperCase() === 'PAID' || (m.status || '').toUpperCase() === 'APPROVED') {
                contractEarned += parseFloat(m.paid || m.amount || '0');
              }
            });

            return (
              <div key={idx} className="p-4 rounded-[12px] bg-white border border-gray shadow-sm hover:border-forest/30 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-heading font-bold text-sm text-ink truncate max-w-md">
                      {agr.terms?.title || 'Agreement'}
                    </span>
                    <Badge status={agr.status || 'Active'} size="sm">{agr.status || 'Active'}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-mono font-semibold text-forest">
                      Earned: {contractEarned.toFixed(3)} MATIC
                    </span>
                    <span className="font-mono text-ink/60">
                      of {agr.terms?.totalAmount || '0'} {agr.terms?.currency || 'MATIC'} total
                    </span>
                  </div>
                </div>

                <ProgressBar value={pct} variant={isCompleted ? 'forest' : isDraft ? 'sage' : 'forest'} />

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  {msList.map((m, mIdx) => {
                    const mStatus = (m.status || (isCompleted ? 'Paid' : 'Pending'));
                    const normStatus = mStatus.toLowerCase();
                    const isMComplete = normStatus === 'paid' || normStatus === 'approved';
                    const isMSubmitted = normStatus === 'submitted';

                    return (
                      <div
                        key={mIdx}
                        className={`px-2.5 py-1 rounded-[6px] text-[11px] font-mono border flex items-center gap-1.5 ${
                          isMComplete ? 'bg-sage-light text-forest border-forest/20'
                          : isMSubmitted ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-gray/50 text-ink/60 border-gray'
                        }`}
                      >
                        <span className="font-bold">M{mIdx + 1}:</span>
                        <span>{m.amount || agr.terms?.milestones?.[mIdx]?.amount || '0'} MATIC</span>
                        <span className="font-sans text-[10px] uppercase font-semibold opacity-75">
                          ({mStatus})
                        </span>
                      </div>
                    );
                  })}
                  {isDraft && (
                    <span className="text-[11px] text-ink/50 italic ml-1">
                      Not yet funded — earnings begin after escrow activation
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
