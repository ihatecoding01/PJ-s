import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export default function CountdownTimer({
  targetDate,
  deadlineLabel = 'Due',
  className = '',
}) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    if (!targetDate) return { isPassed: false, text: 'No deadline' };

    const target = typeof targetDate === 'number'
      ? (targetDate < 1e12 ? targetDate * 1000 : targetDate)
      : new Date(targetDate).getTime();

    const diff = target - Date.now();

    if (diff <= 0) {
      return { isPassed: true, isDueSoon: false, text: 'Passed' };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);

    const isDueSoon = diff < 24 * 60 * 60 * 1000; // Less than 24 hours

    let text = '';
    if (days > 0) {
      text = `${days}d ${hours}h`;
    } else if (hours > 0) {
      text = `${hours}h ${minutes}m`;
    } else {
      text = `${minutes}m remaining`;
    }

    return { isPassed: false, isDueSoon, text };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const { isPassed, isDueSoon, text } = timeLeft;

  let pillClasses = 'bg-sage/70 text-forest border-gray';
  if (isPassed) {
    pillClasses = 'bg-gray text-ink/60 border-gray';
  } else if (isDueSoon) {
    pillClasses = 'bg-coral/20 text-ink border-coral/50 font-semibold';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-mono tabular-nums ${pillClasses} ${className}`}
      title={targetDate ? new Date(targetDate).toLocaleString() : ''}
    >
      {isDueSoon ? (
        <AlertTriangle className="w-3 h-3 text-coral shrink-0" />
      ) : (
        <Clock className="w-3 h-3 shrink-0" />
      )}
      <span>{deadlineLabel}: {text}</span>
    </span>
  );
}
