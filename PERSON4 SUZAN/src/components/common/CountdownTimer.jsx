import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { timeRemaining } from '../../lib/formatters.js';

export default function CountdownTimer({
  targetTime,
  label = 'Time Remaining',
  onExpire,
  className = ''
}) {
  const [remaining, setRemaining] = useState(() => timeRemaining(targetTime));

  useEffect(() => {
    const update = () => {
      const res = timeRemaining(targetTime);
      setRemaining(res);
      if (res.expired && onExpire) {
        onExpire();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetTime, onExpire]);

  if (remaining.expired) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>{label}: Expired</span>
      </div>
    );
  }

  const isUrgent = remaining.days === 0 && remaining.hours < 24;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border ${
        isUrgent
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse'
          : 'bg-surface-800/80 border-slate-700/60 text-slate-200'
      } ${className}`}
    >
      <Clock className={`w-3.5 h-3.5 shrink-0 ${isUrgent ? 'text-amber-400' : 'text-teal-400'}`} />
      <span className="text-slate-400 font-sans mr-0.5">{label}:</span>
      <span>{remaining.text}</span>
    </div>
  );
}
