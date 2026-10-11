
import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Layers,
  DollarSign,
  Star,
  Target,
  Users,
  CreditCard,
  Activity,
} from 'lucide-react';

import { useWallet } from '../context/WalletContext.jsx';
import { apiFetch } from '../api/client.js';
import {
  Card,
  Badge,
  AmountDisplay,
  EmptyState,
  ProgressBar,
} from '../components/ui/index.js';

export default function AnalyticsPage() {
  const { user } = useWallet();

  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState([]);
  const [error, setError] = useState('');

  const role = (user?.role || 'CLIENT').toUpperCase();
  const isClient = role === 'CLIENT';

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const response = await apiFetch('/agreements');

        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.agreements)
            ? response.agreements
            : [];

        if (isMounted) {
          setAgreements(list);
        }
      } catch (err) {
        console.error('Analytics fetch error:', err);

        if (isMounted) {
          setError(
            err?.message || 'Unable to load analytics data.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate analytics metrics.
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
  let totalLockedEth = 0;
  let totalFeesMatic = 0;

  const aiConfidenceScores = [];

  agreements.forEach((agreement) => {
    const amount = Number(
      agreement.terms?.totalAmount || 0
    );

    totalVolume += Number.isFinite(amount) ? amount : 0;

    const status = (
      agreement.status || ''
    ).toUpperCase();

    if (status === 'COMPLETED') {
      completedCount++;
    } else if (
      ['ACTIVE', 'AWAITING_FUNDING', 'AWAITINGFUNDING'].includes(
        status
      )
    ) {
      activeCount++;
    } else if (status === 'DRAFT') {
      draftCount++;
    }

    if (status === 'DISPUTED') {
      disputeCount++;
    }

    const milestones = Array.isArray(agreement.milestones)
      ? agreement.milestones
      : Array.isArray(agreement.terms?.milestones)
        ? agreement.terms.milestones
        : [];

    milestones.forEach((milestone) => {
      totalMilestones++;

      const milestoneStatus = (
        milestone.status || ''
      ).toUpperCase();

      const amountValue = Number(
        milestone.amount || 0
      );

      const penalty = Number(
        milestone.penalty || 0
      );

      if (
        milestone.aiReport?.confidence != null
      ) {
        const confidence = Number(
          milestone.aiReport.confidence
        );

        if (Number.isFinite(confidence)) {
          aiConfidenceScores.push(
            confidence <= 1
              ? confidence * 100
              : confidence
          );
        }
      }

      if (
        ['PAID', 'APPROVED'].includes(
          milestoneStatus
        )
      ) {
        paidMilestones++;
        evaluatedDeliverables++;

        const paid = Number(
          milestone.paid ?? milestone.amount ?? 0
        );

        totalPaidMatic += Number.isFinite(paid)
          ? paid
          : 0;

        const fee = Number(milestone.fee || 0);

        totalFeesMatic += Number.isFinite(fee)
          ? fee
          : 0;

        if (penalty === 0) {
          onTimeDeliverables++;
        }
      } else if (milestoneStatus === 'SUBMITTED') {
        submittedMilestones++;
        evaluatedDeliverables++;

        totalLockedEth += Number.isFinite(amountValue)
          ? amountValue
          : 0;

        if (penalty === 0) {
          onTimeDeliverables++;
        }
      } else {
        pendingMilestones++;

        if (status === 'ACTIVE') {
          totalLockedEth += Number.isFinite(amountValue)
            ? amountValue
            : 0;
        }
      }
    });
  });

  const completionRate = agreements.length
    ? Math.round(
        (completedCount / agreements.length) * 100
      )
    : 0;

  const disputeRate = agreements.length
    ? Math.round(
        (disputeCount / agreements.length) * 100
      )
    : 0;

  const trustScore = Math.max(0, 100 - disputeRate);

  const onTimeRate = evaluatedDeliverables
    ? Math.round(
        (onTimeDeliverables / evaluatedDeliverables) * 100
      )
    : 100;

  const milestoneCompletionRate = totalMilestones
    ? Math.round(
        (paidMilestones / totalMilestones) * 100
      )
    : 0;

  const avgAiConfidence = aiConfidenceScores.length
    ? Math.round(
        aiConfidenceScores.reduce(
          (sum, score) => sum + score,
          0
        ) / aiConfidenceScores.length
      )
    : 0;

  const contractorsCount = new Set(
    agreements
      .map((agreement) => agreement.terms?.freelancer)
      .filter(Boolean)
  ).size;

  const clientsCount = new Set(
    agreements
      .map((agreement) => agreement.terms?.client)
      .filter(Boolean)
  ).size;

  // Loading state.
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-4">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink">
          Performance & Analytics
        </h1>

        <p className="text-sm text-ink/60" role="status">
          Loading analytics...
        </p>
      </div>
    );
  }

  // API error state.
  if (error && agreements.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-4">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink">
          Performance & Analytics
        </h1>

        <Card>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-coral shrink-0" />

            <div>
              <h2 className="font-heading font-bold text-ink">
                Unable to load analytics
              </h2>

              <p className="text-sm text-ink/60 mt-1">
                {error}
              </p>

              <p className="text-xs text-ink/50 mt-2">
                Check your backend connection and try again.
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 rounded-lg bg-forest text-white font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Empty state.
  if (agreements.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink">
            Performance & Analytics
          </h1>

          <p className="text-sm text-ink/60 mt-2">
            {isClient
              ? 'Track spending, project success, and contractor performance.'
              : 'Monitor earnings, delivery performance, and client satisfaction.'}
          </p>
        </div>

        <EmptyState
          icon={BarChart3}
          title="No analytics data yet"
          description="Your analytics will appear once you have agreements and milestone activity."
        />
      </div>
    );
  }

  const MetricCard = ({
    title,
    value,
    description,
    icon: Icon,
    badge,
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-heading font-semibold uppercase tracking-wider text-ink/70">
          {title}
        </span>

        <Icon className="w-5 h-5 text-forest shrink-0" />
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl md:text-3xl font-heading font-bold text-ink tabular-nums">
          {value}
        </div>

        {badge && (
          <Badge status="completed" size="sm">
            {badge}
          </Badge>
        )}
      </div>

      <p className="text-xs text-ink/60 mt-2">
        {description}
      </p>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Page heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
            {isClient
              ? 'Client Analytics'
              : 'Freelancer Analytics'}
          </h1>

          <p className="text-sm text-ink/60 mt-2">
            {isClient
              ? 'Project spending, escrow settlements, and contractor performance.'
              : 'Earnings, delivery performance, and client relationships.'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-sage/40 px-3.5 py-2 rounded-full border border-gray self-start">
          <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />

          <span className="text-xs font-heading font-medium text-forest">
            {isClient ? 'Client Insights' : 'Performance Tracker'}
          </span>
        </div>
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title={isClient ? 'Total Capital Deployed' : 'Lifetime Earnings'}
          value={
            <AmountDisplay
              amount={isClient ? totalVolume : totalPaidMatic}
              size="xl"
            />
          }
          description={
            isClient
              ? `${agreements.length} total agreements`
              : `${paidMilestones} paid milestones`
          }
          icon={DollarSign}
          badge={`${agreements.length} Contracts`}
        />

        <MetricCard
          title="Project Completion Rate"
          value={`${completionRate}%`}
          description={`${completedCount} completed, ${activeCount} active, ${draftCount} drafts`}
          icon={Target}
          badge="Completion"
        />

        <MetricCard
          title={isClient ? 'Dispute-Free Record' : 'Trust Rating'}
          value={`${trustScore}%`}
          description={`${disputeCount} disputes across ${agreements.length} agreements`}
          icon={disputeCount ? AlertTriangle : ShieldCheck}
          badge={disputeCount ? 'Disputed' : 'Clean Record'}
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-sage/20 border-gray">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-forest shrink-0" />

            <div>
              <div className="text-xs text-ink/60 font-medium">
                AI Quality Score
              </div>

              <div className="text-xl font-heading font-bold text-ink">
                {avgAiConfidence}%
              </div>

              <div className="text-[11px] text-ink/50">
                Average confidence
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-sage/20 border-gray">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-forest shrink-0" />

            <div>
              <div className="text-xs text-ink/60 font-medium">
                Milestone Completion
              </div>

              <div className="text-xl font-heading font-bold text-ink">
                {milestoneCompletionRate}%
              </div>

              <div className="text-[11px] text-ink/50">
                {paidMilestones} of {totalMilestones} milestones
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-sage/20 border-gray">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-forest shrink-0" />

            <div>
              <div className="text-xs text-ink/60 font-medium">
                On-Time Delivery
              </div>

              <div className="text-xl font-heading font-bold text-ink">
                {onTimeRate}%
              </div>

              <div className="text-[11px] text-ink/50">
                Based on evaluated milestones
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-sage/20 border-gray">
          <div className="flex items-center gap-3">
            {isClient ? (
              <Users className="w-6 h-6 text-forest shrink-0" />
            ) : (
              <Star className="w-6 h-6 text-forest shrink-0" />
            )}

            <div>
              <div className="text-xs text-ink/60 font-medium">
                {isClient ? 'Contractors Hired' : 'Unique Clients'}
              </div>

              <div className="text-xl font-heading font-bold text-ink">
                {isClient ? contractorsCount : clientsCount}
              </div>

              <div className="text-[11px] text-ink/50">
                Across your agreements
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Spending and escrow overview */}
      <Card>
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray">
          <Layers className="w-5 h-5 text-forest" />

          <div>
            <h2 className="font-heading font-bold text-base text-ink">
              {isClient
                ? 'Spending & Escrow Overview'
                : 'Earnings & Delivery Overview'}
            </h2>

            <p className="text-xs text-ink/60 mt-1">
              Summary of your current agreement activity.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-sage/20 border border-gray">
            <p className="text-xs text-ink/60">
              Total Agreement Value
            </p>

            <p className="text-xl font-heading font-bold text-ink mt-2">
              <AmountDisplay amount={totalVolume} />
            </p>
          </div>

          <div className="p-4 rounded-xl bg-sage/20 border border-gray">
            <p className="text-xs text-ink/60">
              Paid Milestones
            </p>

            <p className="text-xl font-heading font-bold text-forest mt-2">
              {paidMilestones}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-sage/20 border border-gray">
            <p className="text-xs text-ink/60">
              Submitted Milestones
            </p>

            <p className="text-xl font-heading font-bold text-ink mt-2">
              {submittedMilestones}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-sage/20 border border-gray">
            <p className="text-xs text-ink/60">
              Pending Milestones
            </p>

            <p className="text-xl font-heading font-bold text-ink mt-2">
              {pendingMilestones}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-ink/60">
              Overall milestone completion
            </span>

            <span className="font-heading font-bold text-ink">
              {milestoneCompletionRate}%
            </span>
          </div>

          <ProgressBar
            value={milestoneCompletionRate}
            className="mt-2"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          <div className="p-4 rounded-xl border border-gray">
            <div className="flex items-center gap-2 text-ink/70">
              <CreditCard className="w-4 h-4 text-forest" />

              <span className="text-sm">
                Recorded Protocol Fees
              </span>
            </div>

            <p className="text-xl font-heading font-bold text-ink mt-2">
              {totalFeesMatic.toFixed(4)} MATIC
            </p>
          </div>

          <div className="p-4 rounded-xl border border-gray">
            <div className="flex items-center gap-2 text-ink/70">
              <ShieldCheck className="w-4 h-4 text-forest" />

              <span className="text-sm">
                Trust Score
              </span>
            </div>

            <p className="text-xl font-heading font-bold text-ink mt-2">
              {trustScore}%
            </p>
          </div>
        </div>
      </Card>

      {/* Agreement breakdown */}
      <Card>
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray">
          <TrendingUp className="w-5 h-5 text-forest" />

          <div>
            <h2 className="font-heading font-bold text-base text-ink">
              {isClient
                ? 'Project Portfolio'
                : 'Earnings by Contract'}
            </h2>

            <p className="text-xs text-ink/60 mt-1">
              Milestone progress across your agreements.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {agreements.map((agreement, index) => {
            const milestones = Array.isArray(agreement.milestones)
              ? agreement.milestones
              : Array.isArray(agreement.terms?.milestones)
                ? agreement.terms.milestones
                : [];

            const total = milestones.length;
            const paid = milestones.filter((milestone) =>
              ['PAID', 'APPROVED'].includes(
                (milestone.status || '').toUpperCase()
              )
            ).length;

            const submitted = milestones.filter(
              (milestone) =>
                (milestone.status || '').toUpperCase() ===
                'SUBMITTED'
            ).length;

            const status = (
              agreement.status || 'Active'
            ).toUpperCase();

            const isDraft = status === 'DRAFT';
            const isCompleted = status === 'COMPLETED';

            const percentage = total
              ? Math.min(
                  100,
                  Math.round(
                    ((paid + submitted * 0.5) / total) * 100
                  )
                )
              : isCompleted
                ? 100
                : 0;

            let earned = 0;

            milestones.forEach((milestone) => {
              if (
                ['PAID', 'APPROVED'].includes(
                  (milestone.status || '').toUpperCase()
                )
              ) {
                earned += Number(
                  milestone.paid ?? milestone.amount ?? 0
                ) || 0;
              }
            });

            return (
              <div
                key={agreement.id || agreement._id || index}
                className="p-4 rounded-xl bg-white border border-gray shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="font-heading font-bold text-sm text-ink">
                      {agreement.terms?.title || 'Agreement'}
                    </h3>

                    <p className="text-xs text-ink/60 mt-1">
                      {status.replaceAll('_', ' ')}
                    </p>
                  </div>

                  <div className="text-sm font-heading font-bold text-forest">
                    {isClient
                      ? `${agreement.terms?.totalAmount || 0} ${
                          agreement.terms?.currency || 'MATIC'
                        }`
                      : `Earned: ${earned.toFixed(3)} MATIC`}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-ink/60">
                  <span>
                    {paid} of {total} milestones paid
                  </span>

                  <span>{percentage}%</span>
                </div>

                <ProgressBar
                  value={percentage}
                  variant={isDraft ? 'sage' : 'forest'}
                />

                {total > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {milestones.map((milestone, milestoneIndex) => {
                      const milestoneStatus = (
                        milestone.status || 'PENDING'
                      ).toUpperCase();

                      const isPaid = [
                        'PAID',
                        'APPROVED',
                      ].includes(milestoneStatus);

                      const isSubmitted =
                        milestoneStatus === 'SUBMITTED';

                      return (
                        <div
                          key={milestone.id || milestoneIndex}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-mono border ${
                            isPaid
                              ? 'bg-sage-light text-forest border-forest/20'
                              : isSubmitted
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-gray/50 text-ink/60 border-gray'
                          }`}
                        >
                          M{milestoneIndex + 1}: {' '}
                          {milestone.amount || 0} MATIC
                          {' '}({milestoneStatus})
                        </div>
                      );
                    })}
                  </div>
                )}

                {isDraft && (
                  <p className="text-xs text-ink/50 italic">
                    Awaiting escrow funding to activate.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
