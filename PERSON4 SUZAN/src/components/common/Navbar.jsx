import React, { useState } from 'react';
import { useWallet } from '../../context/WalletContext.jsx';
import { DEMO_ACCOUNTS } from '../../mock/mockStore.js';
import Button from './Button.jsx';
import AddressBadge from './AddressBadge.jsx';
import {
  Wallet,
  Users,
  MessageSquare,
  FileCheck,
  User,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  LogOut,
  Layers,
  Menu,
  X
} from 'lucide-react';

export default function Navbar({ activePage, setActivePage }) {
  const {
    address,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    configuredChainId,
    user,
    isMock,
    switchDemoAccount
  } = useWallet();

  const [personaOpen, setPersonaOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'community', label: 'Community', icon: Users },
    { id: 'chat', label: 'Messages', icon: MessageSquare },
    { id: 'agreements', label: 'My Agreements', icon: FileCheck },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'admin', label: 'Admin', icon: ShieldCheck }
  ];

  const handleNavClick = (id) => {
    setActivePage(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-surface-950/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavClick('landing')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 via-indigo-500 to-purple-600 flex items-center justify-center p-0.5 shadow-glow-teal">
              <div className="w-full h-full bg-surface-950 rounded-[10px] flex items-center justify-center">
                <Layers className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-teal-300 via-teal-100 to-indigo-200 bg-clip-text text-transparent">
                  FairWork
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/15 border border-teal-500/30 text-teal-300 font-semibold uppercase">
                  Escrow+AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5 hidden sm:block">Decentralized Agreement Protocol</p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-surface-800 text-teal-400 border border-slate-700/80 shadow-inner'
                      : 'text-slate-300 hover:text-white hover:bg-surface-850/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Wallet & Personas */}
          <div className="flex items-center gap-3">
            {/* Mock Persona Switcher */}
            {isMock && (
              <div className="relative">
                <button
                  onClick={() => setPersonaOpen(!personaOpen)}
                  className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/40 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Persona: <strong>{user?.name?.split(' ')[0] || 'Select'}</strong></span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {personaOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-750 bg-surface-900/95 backdrop-blur-xl p-2 shadow-2xl z-50 animate-fade-in">
                    <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      Switch Demo Role
                    </div>
                    {Object.entries(DEMO_ACCOUNTS).map(([key, acc]) => (
                      <button
                        key={key}
                        onClick={() => {
                          switchDemoAccount(key);
                          setPersonaOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex flex-col gap-0.5 transition-colors ${
                          address === acc.address.toLowerCase()
                            ? 'bg-teal-500/15 text-teal-300 font-semibold'
                            : 'text-slate-300 hover:bg-surface-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{acc.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-800 text-slate-400">
                            {acc.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {acc.address.substring(0, 10)}...
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Network indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-900 border border-slate-800 text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{configuredChainId === 31337 ? 'Hardhat 31337' : 'Amoy 80002'}</span>
            </div>

            {/* Connect Wallet / User Badge */}
            {isConnected ? (
              <div className="flex items-center gap-2">
                <AddressBadge address={address} chars={4} showExplorer={false} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnectWallet}
                  title="Disconnect"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-surface-800"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={connectWallet}
                isLoading={isConnecting}
                icon={Wallet}
              >
                Connect Wallet
              </Button>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-surface-950 px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-surface-800 text-teal-400 font-semibold'
                    : 'text-slate-300 hover:bg-surface-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
