import React from 'react';
import { UserCheck, Shield, Sparkles, Eye, ArrowRight } from 'lucide-react';

export default function RoleBanner({
  role,
  actionPrompt,
  className = ''
}) {
  const configs = {
    CLIENT: {
      title: 'Viewing as Agreement Client',
      badge: 'CLIENT',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      icon: <UserCheck className="w-4 h-4 text-purple-400" />,
      border: 'border-purple-500/30 bg-purple-950/20'
    },
    FREELANCER: {
      title: 'Viewing as Agreement Freelancer',
      badge: 'FREELANCER',
      badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      icon: <Sparkles className="w-4 h-4 text-teal-400" />,
      border: 'border-teal-500/30 bg-teal-950/20'
    },
    ARBITRATOR: {
      title: 'Viewing as Designated Arbitrator',
      badge: 'ARBITRATOR',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: <Shield className="w-4 h-4 text-amber-400" />,
      border: 'border-amber-500/30 bg-amber-950/20'
    },
    VIEWER: {
      title: 'Viewing in Read-Only Observer Mode',
      badge: 'OBSERVER',
      badgeClass: 'bg-slate-700 text-slate-300 border-slate-600',
      icon: <Eye className="w-4 h-4 text-slate-400" />,
      border: 'border-slate-800 bg-surface-900/60'
    }
  };

  const current = configs[role] || configs.VIEWER;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${current.border} backdrop-blur-sm ${className}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-surface-900/80 border border-slate-800">
          {current.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-100">{current.title}</span>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${current.badgeClass}`}>
              {current.badge}
            </span>
          </div>
          {actionPrompt ? (
            <p className="text-xs text-teal-300 mt-0.5 flex items-center gap-1 font-medium">
              <ArrowRight className="w-3 h-3 shrink-0" />
              {actionPrompt}
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">
              Actions and controls on this page are strictly filtered to your cryptographic role.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
