import React from 'react';
import { useWallet } from '../context/WalletContext.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import {
  ShieldCheck,
  Bot,
  GitPullRequest,
  Scale,
  ArrowRight,
  Lock,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2
} from 'lucide-react';

export default function LandingPage({ setActivePage, onOpenAgreement }) {
  const { isConnected, connectWallet } = useWallet();

  const features = [
    {
      icon: Lock,
      title: 'Milestone Escrow',
      desc: 'Smart contract locks full agreement funds upfront. Payments are released per milestone with automated late penalty formulas.'
    },
    {
      icon: Bot,
      title: 'AI Contract Drafting',
      desc: 'Our AI service parses freelance chat discussions into structured, unforgeable AgreementTerms JSON with flagged open questions.'
    },
    {
      icon: GitPullRequest,
      title: 'GitHub Code Analysis',
      desc: 'Every milestone submission inspects commits, merged PRs, AST changes, and test suites to verify progress before client sign-off.'
    },
    {
      icon: Scale,
      title: 'Arbitration Governance',
      desc: 'Parties submit cryptographic evidence threads. A 3-arbitrator panel votes on binding fund distribution, aided by advisory AI summaries.'
    }
  ];

  const steps = [
    {
      num: '01',
      title: 'Meet in Community',
      desc: 'Discover vetted job posts or service listings, submit proposals, and open real-time chat threads.'
    },
    {
      num: '02',
      title: 'Generate AI Agreement',
      desc: 'AI parses scope into milestones, penalties, and acceptance criteria. Both parties review and sign off.'
    },
    {
      num: '03',
      title: 'Lock Escrow On-Chain',
      desc: 'Client creates agreement and funds escrow. Freelancer cryptographically accepts on Polygon or Hardhat.'
    },
    {
      num: '04',
      title: 'Deliver & Release',
      desc: 'Freelancer submits commits. AI validates GitHub signals. Client approves or timeout auto-claims.'
    }
  ];

  return (
    <div className="space-y-24 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-teal-500/20 via-indigo-500/20 to-purple-500/10 blur-[100px] pointer-events-none rounded-full" />
        
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10 px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Blockchain Freelance Escrow</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-100 tracking-tight leading-[1.1]">
            Trustless Agreements. <br />
            <span className="bg-gradient-to-r from-teal-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
              Verified by AI & On-Chain Escrow.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            FairWork eliminates freelance payment risk. Escrow locked on-chain, GitHub commits verified by automated AI signals, and fair community arbitration.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            {isConnected ? (
              <Button
                size="lg"
                variant="primary"
                onClick={() => setActivePage('agreements')}
                icon={ArrowRight}
              >
                Go to My Agreements
              </Button>
            ) : (
              <Button
                size="lg"
                variant="primary"
                onClick={connectWallet}
                icon={Zap}
              >
                Connect Wallet to Start
              </Button>
            )}

            <Button
              size="lg"
              variant="secondary"
              onClick={() => setActivePage('community')}
            >
              Explore Job Feed
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">Engineered for Trust & Precision</h2>
          <p className="text-sm text-slate-400 mt-2">
            Every agreement lifecycle step is backed by Solidity smart contracts and immutable canonical hashes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <Card key={i} hoverEffect className="flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center mb-4 text-teal-400">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4-Step Interactive Flow */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-surface-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">End-to-End Flow</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-1">From First Chat to Final Escrow Release</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, idx) => (
              <div key={idx} className="relative space-y-3">
                <span className="text-3xl font-black font-mono text-slate-700/80">{s.num}</span>
                <h4 className="text-base font-bold text-slate-100">{s.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Demo Agreements Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-teal-950/40 via-surface-900 to-indigo-950/40 border border-teal-500/30">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Ready to test the interactive escrow wizard?</h3>
            <p className="text-xs text-slate-300 mt-1">
              Explore active milestones, inspect AI GitHub verification cards, or test client approval and late penalties.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => onOpenAgreement('ag-1')}
            icon={ArrowRight}
          >
            Open Demo Agreement (ag-1)
          </Button>
        </div>
      </section>
    </div>
  );
}
