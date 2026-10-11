import React from 'react';
import { UserCheck, Shield, Sparkles, Eye, ArrowRight } from 'lucide-react';
import Badge from '../ui/Badge.jsx';

export default function RoleBanner({
  role,
  actionPrompt,
  className = ''
}) {
  const configs = {
    CLIENT: {
      title: 'Viewing as Agreement Client',
      badge: 'CLIENT',
      status: 'pending',
      icon: <UserCheck className="w-4 h-4 text-forest" />,
    },
    FREELANCER: {
      title: 'Viewing as Agreement Freelancer',
      badge: 'FREELANCER',
      status: 'success',
      icon: <Sparkles className="w-4 h-4 text-forest" />,
    },
    ARBITRATOR: {
      title: 'Viewing as Designated Arbitrator',
      badge: 'ARBITRATOR',
      status: 'pending',
      icon: <Shield className="w-4 h-4 text-amber-600" />,
    },
    VIEWER: {
      title: 'Viewing in Read-Only Observer Mode',
      badge: 'OBSERVER',
      status: 'refunded',
      icon: <Eye className="w-4 h-4 text-ink/50" />,
    }
  };

  const current = configs[role] || configs.VIEWER;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-card border border-gray bg-white shadow-sm ${className}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-[8px] bg-sage text-forest">
          {current.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-heading font-semibold text-ink">{current.title}</span>
            <Badge status={current.status} size="sm">
              {current.badge}
            </Badge>
          </div>
          {actionPrompt ? (
            <p className="text-xs text-forest mt-0.5 flex items-center gap-1 font-heading font-semibold">
              <ArrowRight className="w-3 h-3 text-coral shrink-0" />
              {actionPrompt}
            </p>
          ) : (
            <p className="text-xs text-ink/60 mt-0.5">
              Available actions are strictly filtered according to your cryptographic role.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
