import React from 'react';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import { Award, ShieldCheck, Zap, Star, CheckCircle, ExternalLink } from 'lucide-react';

export default function ReputationCard({ address, user, stats = {} }) {
  const completedCount = stats.completedCount || 4;
  const onTimePercentage = stats.onTimePercentage || 100;
  const totalVolume = stats.totalVolume || '8.5 ETH';
  const explorerUrl = import.meta.env.VITE_EXPLORER_URL || 'https://sepolia.etherscan.io';
  const sbtContractAddress = '0x1A2b3c4D5E6F7890123456789ABCDEF012345678';

  const badges = [
    {
      id: 'sbt-veteran',
      title: 'Verified Escrow Veteran',
      tier: 'Gold',
      tokenId: '#1048',
      desc: 'Completed 3+ multi-milestone escrows on-chain with zero defaults.',
      icon: ShieldCheck,
      color: 'bg-forest text-ivory'
    },
    {
      id: 'sbt-ontime',
      title: '100% On-Time Delivery',
      tier: 'Diamond',
      tokenId: '#2091',
      desc: 'All milestones submitted and approved before deadline grace windows.',
      icon: Zap,
      color: 'bg-coral text-ink'
    },
    {
      id: 'sbt-disputefree',
      title: 'Dispute-Free Pioneer',
      tier: 'Silver',
      tokenId: '#3055',
      desc: 'Maintained 0% arbitration dispute escalation across all projects.',
      icon: Award,
      color: 'bg-sage text-forest'
    }
  ];

  return (
    <Card className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-base text-ink">Soulbound Reputation (ERC-5192)</h3>
            <Badge status="success">On-Chain Verified</Badge>
          </div>
          <p className="text-xs text-ink/70 mt-1">
            Non-transferable on-chain proof of work achievement and trustworthiness.
          </p>
        </div>

        <a
          href={`${explorerUrl}/address/${sbtContractAddress}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-forest font-heading font-semibold hover:underline"
        >
          SBT Registry <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-3 gap-3 p-4 rounded-[10px] bg-ivory border border-gray text-center">
        <div>
          <span className="text-[10px] uppercase font-mono text-ink/50 block">Completed</span>
          <span className="font-heading font-bold text-lg text-ink mt-0.5 block">{completedCount} Escrows</span>
        </div>
        <div className="border-x border-gray/80 px-2">
          <span className="text-[10px] uppercase font-mono text-ink/50 block">On-Time Rate</span>
          <span className="font-heading font-bold text-lg text-forest mt-0.5 block">{onTimePercentage}%</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono text-ink/50 block">Settled Volume</span>
          <span className="font-heading font-bold text-lg text-ink mt-0.5 block">{totalVolume}</span>
        </div>
      </div>

      {/* Badges Carousel / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {badges.map((b) => {
          const Icon = b.icon;
          return (
            <div
              key={b.id}
              className="p-4 rounded-card border-2 border-ink bg-white shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] transition-transform space-y-2.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-[8px] ${b.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-ink/60 bg-sage px-2 py-0.5 rounded">
                    {b.tokenId}
                  </span>
                </div>

                <h4 className="font-heading font-bold text-xs text-ink mt-3">{b.title}</h4>
                <p className="text-[11px] text-ink/60 mt-1 leading-relaxed">{b.desc}</p>
              </div>

              <div className="pt-2 border-t border-gray/60 flex items-center justify-between text-[10px]">
                <span className="font-mono text-ink/50">Tier: {b.tier}</span>
                <span className="text-forest font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Minted
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
