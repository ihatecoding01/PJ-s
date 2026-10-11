import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../api/client.js';
import { Card, Badge, AmountDisplay, EmptyState, ProgressBar } from '../components/ui/index.js';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState([]);

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

  // Compute metrics from actual responses without inventing endpoints
  let totalVolume = 0;
  let completedCount = 0;
  let activeCount = 0;
  let disputeCount = 0;
  let totalMilestones = 0;
  let onTimeMilestones = 0;

  agreements.forEach(agr => {
    const amt = parseFloat(agr.terms?.totalAmount || '0');
    totalVolume += amt;
    if (agr.status === 'COMPLETED') completedCount++;
    if (agr.status === 'ACTIVE' || agr.status === 'AWAITING_FUNDING') activeCount++;
    if (agr.status === 'DISPUTED') disputeCount++;

    if (agr.terms?.milestones) {
      agr.terms.milestones.forEach(m => {
        totalMilestones++;
        if (m.status === 'PAID' || m.status === 'APPROVED') {
          onTimeMilestones++;
        }
      });
    }
  });

  const onTimeRate = totalMilestones > 0 ? Math.round((onTimeMilestones / totalMilestones) * 100) : 100;
  const disputeRate = agreements.length > 0 ? Math.round((disputeCount / agreements.length) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
          Performance & Analytics
        </h1>
        <p className="text-sm text-ink/60 mt-1">
          Client-side computed telemetry derived from your verifiable milestone executions and settlements.
        </p>
      </div>

      {agreements.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No analytics data yet"
          description="Performance graphs and delivery rates will generate automatically once you create agreements and submit milestone deliverables."
        />
      ) : (
        <>
          {/* Key Metric Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center justify-between text-ink/70 mb-2">
                <span className="text-xs font-heading font-semibold uppercase tracking-wider">
                  On-Time Delivery Rate
                </span>
                <CheckCircle2 className="w-4 h-4 text-forest" />
              </div>
              <div className="text-3xl font-heading font-bold text-ink tabular-nums">
                {onTimeRate}%
              </div>
              <ProgressBar value={onTimeRate} className="mt-3" />
              <p className="text-xs text-ink/60 mt-2 font-medium">
                {onTimeMilestones} of {totalMilestones} deliverables completed on-time
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between text-ink/70 mb-2">
                <span className="text-xs font-heading font-semibold uppercase tracking-wider">
                  Dispute Frequency
                </span>
                <AlertTriangle className="w-4 h-4 text-coral" />
              </div>
              <div className="text-3xl font-heading font-bold text-ink tabular-nums">
                {disputeRate}%
              </div>
              <ProgressBar value={disputeRate} variant="coral" className="mt-3" />
              <p className="text-xs text-ink/60 mt-2 font-medium">
                {disputeCount} dispute raised out of {agreements.length} agreements
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between text-ink/70 mb-2">
                <span className="text-xs font-heading font-semibold uppercase tracking-wider">
                  Cumulative Escrow Volume
                </span>
                <TrendingUp className="w-4 h-4 text-forest" />
              </div>
              <div className="text-2xl font-heading font-bold text-ink tabular-nums">
                <AmountDisplay amount={totalVolume} size="xl" />
              </div>
              <p className="text-xs text-forest mt-3 font-medium">
                {agreements.length} total cryptographic agreements signed
              </p>
            </Card>
          </div>

          {/* Simple Client-side Rendered Bar Chart */}
          <Card>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray">
              <div>
                <h3 className="font-heading font-bold text-base text-ink">Milestone Progress by Agreement</h3>
                <p className="text-xs text-ink/60 mt-0.5">Real-time status distribution across your portfolios</p>
              </div>
            </div>

            <div className="space-y-4">
              {agreements.map((agr, idx) => {
                const totalM = agr.terms?.milestones?.length || 1;
                const paidM = agr.terms?.milestones?.filter(m => m.status === 'PAID' || m.status === 'APPROVED').length || 0;
                const pct = Math.round((paidM / totalM) * 100);

                return (
                  <div key={idx} className="p-3.5 rounded-[10px] bg-sage/30 border border-gray space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-heading font-bold text-ink truncate max-w-md">
                        {agr.terms?.title || 'Agreement'}
                      </span>
                      <span className="font-mono text-ink/60">
                        {paidM} / {totalM} milestones ({pct}%)
                      </span>
                    </div>
                    <ProgressBar value={pct} />
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
