import React, { useState, useEffect } from 'react';
import { Users, Mail, FileCheck2, ExternalLink, MessageSquare, ArrowUpRight, Star, Briefcase, Zap } from 'lucide-react';
import { useWallet } from '../context/WalletContext.jsx';
import { apiFetch } from '../api/client.js';
import { DEMO_ACCOUNTS } from '../mock/mockStore.js';
import { Card, Button, Badge, AmountDisplay, EmptyState, AddressChip } from '../components/ui/index.js';

export default function ClientsPage({ onOpenAgreement, onNavigateToChat }) {
  const { address, user } = useWallet();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);

  const role = (user?.role || 'CLIENT').toUpperCase();
  const isClient = role === 'CLIENT';
  const isFreelancer = role === 'FREELANCER';

  useEffect(() => {
    let isMounted = true;
    async function loadCounterparties() {
      try {
        setLoading(true);
        const [agrsRes, threadsRes] = await Promise.allSettled([
          apiFetch('/agreements'),
          apiFetch('/community/threads'),
        ]);

        const counterpartiesMap = new Map();

        // 1. Derive from Agreements
        if (agrsRes.status === 'fulfilled' && agrsRes.value) {
          const list = Array.isArray(agrsRes.value) ? agrsRes.value : (agrsRes.value?.agreements || []);
          list.forEach(agr => {
            const myAddr = (address || '').toLowerCase();
            const clientAddr = (agr.clientAddress || agr.terms?.client || '').toLowerCase();
            const freelancerAddr = (agr.freelancerAddress || agr.terms?.freelancer || '').toLowerCase();

            // Determine other party
            const otherAddr = clientAddr === myAddr ? freelancerAddr : clientAddr;
            if (!otherAddr) return;

            // Determine other party's role
            const otherRole = otherAddr === clientAddr ? 'CLIENT' : 'FREELANCER';

            const existing = counterpartiesMap.get(otherAddr) || {
              address: otherAddr,
              name: agr.counterpartyName || (otherRole === 'CLIENT' ? 'Client' : 'Freelancer'),
              role: otherRole,
              agreementsCount: 0,
              totalValueMatic: 0,
              completedCount: 0,
              activeCount: 0,
              agreements: [],
              lastActive: agr.createdAt || Date.now(),
            };

            existing.agreementsCount += 1;
            existing.totalValueMatic += parseFloat(agr.terms?.totalAmount || '0');
            existing.agreements.push(agr);

            const agrStatus = (agr.status || '').toUpperCase();
            if (agrStatus === 'COMPLETED') existing.completedCount++;
            if (agrStatus === 'ACTIVE') existing.activeCount++;

            counterpartiesMap.set(otherAddr, existing);
          });
        }

        // 2. Supplement from Threads
        if (threadsRes.status === 'fulfilled' && threadsRes.value) {
          const threadsList = Array.isArray(threadsRes.value) ? threadsRes.value : (threadsRes.value?.threads || []);
          threadsList.forEach(t => {
            const otherUser = t.otherParticipant || t.recipient;
            if (otherUser?.walletAddress) {
              const addr = otherUser.walletAddress.toLowerCase();
              const existing = counterpartiesMap.get(addr) || {
                address: addr,
                name: otherUser.name || 'Community Member',
                role: 'UNKNOWN',
                agreementsCount: 0,
                totalValueMatic: 0,
                completedCount: 0,
                activeCount: 0,
                agreements: [],
                lastActive: t.updatedAt || Date.now(),
              };
              if (otherUser.name && existing.name.includes('0x')) {
                existing.name = otherUser.name;
              }
              counterpartiesMap.set(addr, existing);
            }
          });
        }

        // Fallback realistic demo clients if map is empty
        if (counterpartiesMap.size === 0) {
          if (isFreelancer) {
            const cAddr = DEMO_ACCOUNTS.CLIENT.address.toLowerCase();
            counterpartiesMap.set(cAddr, {
              address: cAddr,
              name: DEMO_ACCOUNTS.CLIENT.name,
              role: 'CLIENT',
              agreementsCount: 2,
              totalValueMatic: 4.3,
              completedCount: 1,
              activeCount: 1,
              agreements: [],
              lastActive: Date.now() - 86400000,
            });
          } else {
            const fAddr = DEMO_ACCOUNTS.FREELANCER.address.toLowerCase();
            counterpartiesMap.set(fAddr, {
              address: fAddr,
              name: DEMO_ACCOUNTS.FREELANCER.name,
              role: 'FREELANCER',
              agreementsCount: 2,
              totalValueMatic: 4.3,
              completedCount: 1,
              activeCount: 1,
              agreements: [],
              lastActive: Date.now() - 86400000,
            });
          }
        }

        if (isMounted) {
          setClients(Array.from(counterpartiesMap.values()));
        }
      } catch (err) {
        console.warn('Clients derivation error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCounterparties();
    return () => { isMounted = false; };
  }, [address]);

  const pageTitle = isFreelancer ? 'My Clients' : 'My Freelancers';
  const pageDescription = isFreelancer
    ? 'Clients you\'ve worked with, including shared project volumes and collaboration history.'
    : 'Freelancers you\'ve hired, their delivery track records, and shared escrow volume.';

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
            {pageTitle}
          </h1>
          <p className="text-sm text-ink/60 mt-1">
            {pageDescription}
          </p>
        </div>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={isFreelancer ? "No clients yet" : "No freelancers yet"}
          description={isFreelancer
            ? "Your clients will appear here as you take on gigs and enter milestone agreements."
            : "Freelancers you've hired will appear here as you create projects and fund escrows."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((c, idx) => (
            <Card key={idx} className="hover:border-forest/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-sm ${
                      c.role === 'CLIENT'
                        ? 'bg-coral/20 text-coral'
                        : 'bg-forest text-ivory'
                    }`}>
                      {c.name ? c.name.charAt(0) : 'C'}
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-sm text-ink truncate">
                        {c.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <AddressChip address={c.address} showExplorer={false} />
                      </div>
                    </div>
                  </div>
                  <Badge status={c.role === 'CLIENT' ? 'info' : 'success'} size="sm">
                    {c.role === 'CLIENT' ? 'Client' : 'Freelancer'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray my-3 text-xs">
                  <div>
                    <span className="text-ink/60 block">Projects</span>
                    <span className="font-heading font-bold text-sm text-ink tabular-nums">
                      {c.agreementsCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink/60 block">Volume</span>
                    <AmountDisplay amount={c.totalValueMatic} size="sm" />
                  </div>
                  <div>
                    <span className="text-ink/60 block">Completed</span>
                    <span className="font-heading font-bold text-sm text-forest tabular-nums">
                      {c.completedCount}
                    </span>
                  </div>
                </div>

                {/* Status indicators */}
                <div className="flex items-center gap-2 text-xs mb-2">
                  {c.activeCount > 0 && (
                    <span className="flex items-center gap-1 text-forest font-medium">
                      <Zap className="w-3 h-3" /> {c.activeCount} active
                    </span>
                  )}
                  {c.completedCount > 0 && (
                    <span className="flex items-center gap-1 text-ink/60 font-medium">
                      <Star className="w-3 h-3" /> {c.completedCount} completed
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => onNavigateToChat ? onNavigateToChat() : null}
                  icon={MessageSquare}
                >
                  Message
                </Button>
                {c.agreements.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => onOpenAgreement ? onOpenAgreement(c.agreements[0].id) : null}
                  >
                    View Project
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
