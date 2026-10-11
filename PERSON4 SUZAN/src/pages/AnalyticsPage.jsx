
import React, { useEffect, useState } from 'react';
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

  const isClient =
    (user?.role || 'CLIENT').toUpperCase() === 'CLIENT';

  useEffect(() => {
    let mounted = true;

    async function loadAnalytics() {
      try {
        setLoading(true);
        setError('');

        const response = await apiFetch('/agreements');

        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.agreements)
            ? response.agreements
            : [];

        if (mounted) {
          setAgreements(list);
        }
      } catch (err) {
        console.error('Analytics fetch error:', err);

        if (mounted) {
          setError(
            err?.message || 'Unable to load analytics data.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, []);

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

  let totalPaid = 0;
  let totalLocked = 0;
  let totalFees = 0;

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
      [
        'ACTIVE',
        'AWAITING_FUNDING',
        'AWAITINGFUNDING',
      ].includes(status)
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

      const milestoneAmount = Number(
        milestone.amount || 0
      );

      const penalty = Number(milestone.penalty || 0);

      if (milestone.aiReport?.confidence != null) {
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
        ['PAID', 'APPROVED'].includes(milestoneStatus)
      ) {
        paidMilestones++;
        evaluatedDeliverables++;

        totalPaid += Number(
          milestone.paid ?? milestone.amount ?? 0
        ) || 0;

        totalFees += Number(milestone.fee || 0) || 0;

        if (penalty === 0) {
          onTimeDeliverables++;
        }
      } else if (milestoneStatus === 'SUBMITTED') {
        submittedMilestones++;
        evaluatedDeliverables++;
        totalLocked += milestoneAmount;

        if (penalty === 0) {
          onTimeDeliverables++;
        }
      } else {
        pendingMilestones++;

        if (status === 'ACTIVE') {
          totalLocked += milestoneAmount;
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

  const uniqueContractors = new Set(
    agreements
      .map((agreement) => agreement.terms?.freelancer)
      .filter(Boolean)
  ).size;

  const uniqueClients = new Set(
    agreements
      .map((agreement) => agreement.terms?.client)
      .filter(Boolean)
  ).size;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink">
          Performance &amp; Analytics
        </h1>
        <p className="text-sm text-ink/60 mt-3" role="status">
          Loading analytics...
        </p>
      </div>
    );
  }

  if (error && agreements.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-4">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink">
          Performance &amp; Analytics
        </h1>

        <Card>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-coral shrink-0" />

            <div>
              <h2 className="font-heading font-bold text-ink">
                Unable to load analytics
              </h2>

              <p className="text-sm text-ink/60 mt-2">
                {error}
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 rounded-lg bg-forest text-white"
              >
                Retry
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (agreements.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink">
            Performance &amp; Analytics
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

  const metrics = [
    {
      title: isClient
        ? 'Total Capital Deployed'
        : 'Lifetime Earnings',
      value: isClient
        ? totalVolume.toFixed(3)
        : totalPaid.toFixed(3),
      description: isClient
        ? `${agreements.length} agreements`
        : `${paidMilestones} paid milestones`,
      icon: DollarSign,
    },
    {
      title: 'Project Completion Rate',
      value: `${completionRate}%`,
      description: `${completedCount} completed, ${activeCount} active, ${draftCount} drafts`,
      icon: Target,
    },
    {
      title: isClient
        ? 'Dispute-Free Record'
        : 'Trust Rating',
      value: `${trustScore}%`,
      description: `${disputeCount} disputes across ${agreements.length} agreements`,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
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

        <div className="flex items-center gap-2 bg-sage/40 px-3.5 py-2 rounded-full border border-gray">
          <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
          <span className="text-xs font-heading font-medium text-forest">
            {isClient ? 'Client Insights' : 'Performance Tracker'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Card
              key={metric.title}
              className="hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-xs font-heading font-semibold uppercase tracking-wider text-ink/70">
                  {metric.title}
                </span>
                <Icon className="w-5 h-5 text-forest" />
              </div>

              <div className="text-2xl md:text-3xl font-heading font-bold text-ink tabular-nums">
                {metric.value}
              </div>

              <p className="text-xs text-ink/60 mt-2">
                {metric.description}
              </p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-sage/20 border-gray">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-forest shrink-0" />
            <div>
              <p className="text-xs text-ink/60">AI Quality Score</p>
              <p className="text-xl font-heading font-bold text-ink">
                {avgAiConfidence}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-sage/20 border-gray">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-forest shrink-0" />
            <div>
              <p className="text-xs text-ink/60">Milestone Completion</p>
              <p className="text-xl font-heading font-bold text-ink">
                {milestoneCompletionRate}%
              </p>
              <p className="text-xs text-ink/50">
                {paidMilestones}/{totalMilestones} milestones
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-sage/20 border-gray">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-forest shrink-0" />
            <div>
              <p className="text-xs text-ink/60">On-Time Delivery</p>
              <p className="text-xl font-heading font-bold text-ink">
                {onTimeRate}%
              </p>
              <p className="text-xs text-ink/50">
                Evaluated milestones
              </p>
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
              <p className="text-xs text-ink/60">
                {isClient ? 'Contractors Hired' : 'Unique Clients'}
              </p>
              <p className="text-xl font-heading font-bold text-ink">
                {isClient
                  ? uniqueContractors
                  : uniqueClients}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray">
          <Layers className="w-5 h-5 text-forest" />

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
              agreement.status || 'ACTIVE'
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
                      {status.replace(/_/g, ' ')}
                    </p>
                  </div>

                  <div className="text-sm font-heading font-bold text-forest">
                    {isClient
                      ? `${agreement.terms?.totalAmount || 0} ${
                          agreement.terms?.currency || 'MATIC'
                        }`
                      : `Earned: ${earned.toFixed(3)} ${
                          agreement.terms?.currency || 'MATIC'
                        }`}
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

                {milestones.length > 0 && (
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
                          M{milestoneIndex + 1}: {milestone.amount || 0}{' '}
                          {agreement.terms?.currency || 'MATIC'} (
                          {milestoneStatus})
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

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-ink/60">Total Agreement Value</p>
            <p className="text-xl font-heading font-bold text-ink mt-2">
              <AmountDisplay amount={totalVolume} />
            </p>
          </div>

          <div>
            <p className="text-xs text-ink/60">Recorded Protocol Fees</p>
            <p className="text-xl font-heading font-bold text-ink mt-2">
              {totalFees.toFixed(4)}
            </p>
          </div>

          <div>
            <p className="text-xs text-ink/60">Currently Locked</p>
            <p className="text-xl font-heading font-bold text-ink mt-2">
              {totalLocked.toFixed(3)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
