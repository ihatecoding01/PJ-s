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
