import React, { useState, useEffect } from 'react';
import { getAgreements } from '../api/agreements.js';
import { mockStore } from '../mock/mockStore.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Card, Badge, Button, AmountDisplay, EmptyState } from '../components/ui/index.js';
import AddressChip from '../components/ui/AddressChip.jsx';
import { formatRelativeTime } from '../lib/formatters.js';
import {
  FileCheck,
  ArrowRight,
  Filter,
  Coins,
  Clock,
  AlertCircle,
  Plus,
  Wallet,
  ChevronRight,
  Shield,
  Briefcase,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  UserCheck,
  Send
} from 'lucide-react';

export default function MyAgreementsPage({ onOpenAgreement, onOpenDraft, onNavigateToCommunity }) {
  const { address, isConnected, openConnectModal, user } = useWallet();
  const toast = useToast();

  const isClientRole = (user?.role || '').toUpperCase() === 'CLIENT';
  const isFreelancerRole = (user?.role || '').toUpperCase() === 'FREELANCER';

  const [agreements, setAgreements] = useState([]);
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'CLIENT' | 'FREELANCER'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Automatically adapt role filter when persona changes
  useEffect(() => {
    if (isClientRole) {
      setRoleFilter('CLIENT');
    } else if (isFreelancerRole) {
      setRoleFilter('FREELANCER');
    } else {
      setRoleFilter('ALL');
    }
  }, [user?.role, address]);

  const fetchAgreementsList = async () => {
    if (!isConnected) {
      setAgreements([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      let data = [];
      try {
        data = await getAgreements();
      } catch (err) {
        console.warn('Backend agreements fetch error, falling back:', err);
        data = (mockStore.data && mockStore.data.agreements) || [];
      }
      setAgreements(data || []);
    } catch (err) {
      toast.error('Could not load agreements list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchAgreementsList();
    } else {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Filter agreements
  const filtered = agreements.filter(ag => {
    const isClient = address && ag.terms?.client && address.toLowerCase() === ag.terms.client.toLowerCase();
    const isFreelancer = address && ag.terms?.freelancer && address.toLowerCase() === ag.terms.freelancer.toLowerCase();

    if (roleFilter === 'CLIENT' && !isClient) return false;
    if (roleFilter === 'FREELANCER' && !isFreelancer) return false;
    if (statusFilter !== 'ALL' && ag.status !== statusFilter) return false;

    return true;
  });

  // Calculate high-level role metrics
  const myAgreements = agreements.filter(ag => {
    if (isClientRole) {
      return address && ag.terms?.client && address.toLowerCase() === ag.terms.client.toLowerCase();
    }
    if (isFreelancerRole) {
      return address && ag.terms?.freelancer && address.toLowerCase() === ag.terms.freelancer.toLowerCase();
    }
    return true;
  });

  const totalValue = myAgreements.reduce((sum, ag) => sum + parseFloat(ag.terms?.totalAmount || '0'), 0);
  const activeCount = myAgreements.filter(ag => ag.status === 'Active').length;
  const completedCount = myAgreements.filter(ag => ag.status === 'Completed').length;
  const pendingActionCount = myAgreements.filter(ag => {
    if (ag.status === 'Draft') return true;
    if (isClientRole && ag.status === 'AwaitingFunding') return true;
    if (isClientRole && ag.status === 'Active' && ag.milestones?.some(m => m.status === 'Submitted')) return true;
    if (isFreelancerRole && ag.status === 'Active' && ag.milestones?.some(m => m.status === 'Pending')) return true;
    return false;
  }).length;

  // Determine next required action callout
  const getNextAction = (ag) => {
    const isClient = address && ag.terms?.client && address.toLowerCase() === ag.terms.client.toLowerCase();
    const isFreelancer = address && ag.terms?.freelancer && address.toLowerCase() === ag.terms.freelancer.toLowerCase();

    if (ag.status === 'Draft') {
      if (isClient && !ag.clientApproved) return 'Waiting for you to approve draft terms';
      if (isFreelancer && !ag.freelancerApproved) return 'Waiting for you to approve draft terms';
      return 'Waiting for counterparty draft approval';
    }
    if (ag.status === 'AwaitingFunding') {
      if (isClient) return 'Waiting for you to fund';
      return 'Waiting for client to fund escrow on-chain';
    }
    if (ag.status === 'Active') {
      const submittedM = ag.milestones?.find(m => m.status === 'Submitted');
      if (submittedM && isClient) return `Milestone #${submittedM.idx + 1} submitted: Review required`;
      const pendingM = ag.milestones?.find(m => m.status === 'Pending');
      if (pendingM && isFreelancer) return `Deliverable in progress: Milestone #${pendingM.idx + 1}`;
      return 'Milestone escrow active and monitored';
    }
    if (ag.status === 'Disputed') {
      return 'Action required: Arbitration tribunal voting active';
    }
    if (ag.status === 'Completed') {
      return 'Agreement completed! All milestones released.';
    }
    return 'No immediate action required';
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-card bg-sage flex items-center justify-center text-forest">
          <FileCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-heading font-bold text-ink">Connect Your Wallet to View Agreements</h2>
          <p className="text-sm text-ink/60 max-w-md mx-auto">
            Connect via MetaMask or select an instant demo persona to view and manage your milestone escrow agreements.
          </p>
        </div>
        <div className="pt-2">
          <Button variant="primary" size="lg" onClick={openConnectModal} icon={Wallet}>
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
              {isClientRole ? 'Commissioned Agreements' : isFreelancerRole ? 'My Contracts & Active Gigs' : 'My Agreements'}
            </h1>
            <span className="text-xs font-heading font-bold px-2 py-0.5 rounded-full bg-forest text-ivory">
              {isClientRole ? 'Client View' : isFreelancerRole ? 'Freelancer View' : 'All Roles'}
            </span>
          </div>
          <p className="text-sm text-ink/60 mt-1">
            {isClientRole
              ? 'Manage funded milestone escrows, review incoming contractor submissions, and approve releases.'
              : isFreelancerRole
              ? 'Track contracted deliverables, in-progress milestones, AI proof verification, and incoming payouts.'
              : 'Track escrow states, next required actions, milestone reviews, and on-chain funding.'}
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={onNavigateToCommunity}
          icon={Plus}
        >
          {isClientRole ? 'Hire Talent' : 'Find Gigs'}
        </Button>
      </div>

      {/* Role Summary Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-gray">
          <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-ink/50 block">
            {isClientRole ? 'Total Escrow Budget' : 'Total Contract Value'}
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-heading font-bold text-ink">{totalValue.toFixed(2)}</span>
            <span className="text-xs font-mono text-ink/60">MATIC</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray">
          <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-ink/50 block">
            {isClientRole ? 'Active Escrows' : 'Active Gigs'}
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-heading font-bold text-forest">{activeCount}</span>
            <span className="text-xs text-ink/50">agreements</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray">
          <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-ink/50 block">
            {isClientRole ? 'Reviews Required' : 'Action Required'}
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-heading font-bold text-coral">{pendingActionCount}</span>
            <span className="text-xs text-ink/50">pending</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray">
          <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-ink/50 block">
            Completed Projects
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-heading font-bold text-ink">{completedCount}</span>
            <span className="text-xs text-ink/50">settled</span>
          </div>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3.5 rounded-card border border-gray shadow-sm">
        {/* Role Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-heading font-semibold uppercase tracking-wider text-ink/60 mr-1">
            View Role:
          </span>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'CLIENT', label: 'Client' },
            { id: 'FREELANCER', label: 'Freelancer' }
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-heading font-medium transition-all ${
                roleFilter === r.id
                  ? 'bg-forest text-ivory font-semibold shadow-sm'
                  : 'bg-sage/50 text-ink/70 hover:bg-sage border border-gray'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Statuses' },
            { id: 'Draft', label: 'Draft' },
            { id: 'AwaitingFunding', label: 'Awaiting Funding' },
            { id: 'Active', label: 'Active' },
            { id: 'Completed', label: 'Completed' },
            { id: 'Disputed', label: 'Disputed' }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-2.5 py-1 rounded-[6px] text-xs font-mono transition-all ${
                statusFilter === s.id
                  ? 'bg-sage-light text-forest border border-forest/30 font-semibold'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agreements Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-60 rounded-card bg-white border border-gray p-6 animate-pulse space-y-4">
              <div className="h-5 bg-gray rounded w-2/3" />
              <div className="h-4 bg-gray/60 rounded w-full" />
              <div className="h-4 bg-gray/60 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="No agreements found"
          description={
            isClientRole
              ? "You haven't commissioned any agreements matching this filter. Hire talent to get started."
              : isFreelancerRole
              ? "You haven't been contracted on any agreements matching this filter. Explore open gigs to get hired."
              : "You do not have any agreements matching the active filter criteria."
          }
          actionLabel={isClientRole ? "Hire Talent" : "Explore Projects"}
          onAction={onNavigateToCommunity}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(ag => {
            const isClient = address && ag.terms?.client && address.toLowerCase() === ag.terms.client.toLowerCase();
            const isFreelancer = address && ag.terms?.freelancer && address.toLowerCase() === ag.terms.freelancer.toLowerCase();
            const nextAction = getNextAction(ag);
            const counterpartyAddr = isClient ? ag.terms?.freelancer : ag.terms?.client;
            const counterpartyRole = isClient ? 'Freelancer' : 'Client';

            return (
              <Card
                key={ag.id}
                className="hover:border-forest/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-heading font-bold text-base text-ink line-clamp-1">
                      {ag.terms?.title || 'Smart Escrow Agreement'}
                    </h3>
                    <Badge status={ag.status} size="sm">
                      {ag.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-heading font-semibold text-forest bg-sage px-2 py-0.5 rounded-full">
                      {isClient ? 'My Role: Client' : isFreelancer ? 'My Role: Freelancer' : 'Counterparty'}
                    </span>
                    <span className="text-xs text-ink/50 font-mono">
                      {ag.terms?.milestones?.length || 1} milestones
                    </span>
                  </div>

                  {counterpartyAddr && (
                    <div className="flex items-center justify-between text-xs text-ink/60 mb-3 pb-2 border-b border-gray/50">
                      <span>{counterpartyRole}:</span>
                      <AddressChip address={counterpartyAddr} showExplorer={false} />
                    </div>
                  )}

                  <div className="p-3 rounded-[10px] bg-ivory border border-gray mb-4">
                    <span className="text-[10px] font-heading font-semibold text-ink/60 uppercase tracking-wider block mb-0.5">
                      Next Required Action
                    </span>
                    <p className="text-xs font-heading font-semibold text-forest flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-coral shrink-0" />
                      {nextAction}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="pt-3 border-t border-gray flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-ink/50 uppercase block font-heading font-semibold">
                        Total Amount
                      </span>
                      <AmountDisplay amount={ag.terms?.totalAmount || '0'} size="md" />
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (ag.status === 'Draft') {
                          onOpenDraft(ag.id);
                        } else {
                          onOpenAgreement(ag.id);
                        }
                      }}
                      icon={ChevronRight}
                    >
                      {ag.status === 'Draft' ? 'Review Draft' : 'Open Dashboard'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
