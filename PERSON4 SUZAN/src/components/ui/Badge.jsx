import React from 'react';

/**
 * SANKALP Status Badge
 * Strict mapping:
 * - Success / Approved / Paid: sage green (bg-sage-light text-forest)
 * - Pending / Submitted / In review: soft amber
 * - Disputed / Rejected: muted coral
 * - In escrow / Funded: pale sage + forest text
 * - Refunded: gray with forest text
 */
export default function Badge({
  children,
  status,
  variant = 'default',
  size = 'md',
  className = '',
  icon: Icon
}) {
  const normalized = (status || children || '').toString().toLowerCase().replace(/_/g, ' ').trim();

  let statusStyle = 'bg-gray text-ink border-gray';

  if (['approved', 'paid', 'completed', 'active', 'success', 'verified', 'accepted'].some(s => normalized.includes(s))) {
    statusStyle = 'bg-sage-light text-forest border-forest/20 font-medium';
  } else if (['in escrow', 'funded', 'awaitingfunding', 'awaiting funding', 'locked'].some(s => normalized.includes(s))) {
    statusStyle = 'bg-sage-light text-forest border-forest/30 font-semibold';
  } else if (['pending', 'submitted', 'in review', 'reviewing', 'draft'].some(s => normalized.includes(s))) {
    statusStyle = 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] font-medium';
  } else if (['disputed', 'rejected', 'cancelled', 'error', 'due soon', 'late'].some(s => normalized.includes(s))) {
    statusStyle = 'bg-coral/25 text-ink border-coral/50 font-medium';
  } else if (['refunded'].some(s => normalized.includes(s))) {
    statusStyle = 'bg-gray text-forest border-gray font-medium';
  } else if (variant === 'forest') {
    statusStyle = 'bg-forest text-ivory border-forest';
  } else if (variant === 'coral') {
    statusStyle = 'bg-coral/30 text-ink border-coral/60';
  } else if (variant === 'sage') {
    statusStyle = 'bg-sage text-forest border-gray';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeClasses[size] || sizeClasses.md} ${statusStyle} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 flex-shrink-0" />}
      <span>{children}</span>
    </span>
  );
}
