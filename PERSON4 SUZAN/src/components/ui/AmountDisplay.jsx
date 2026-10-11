import React from 'react';

export default function AmountDisplay({
  amount,
  size = 'md',
  currency = 'MATIC',
  showInr = true,
  className = '',
}) {
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount || '0') || 0;
  const inrRate = import.meta.env.VITE_INR_RATE ? parseFloat(import.meta.env.VITE_INR_RATE) : null;

  const sizeClasses = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-semibold',
    lg: 'text-xl font-bold font-heading',
    xl: 'text-2xl md:text-3xl font-bold font-heading',
  };

  const formattedMatic = numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  const inrAmount = inrRate ? Math.round(numericAmount * inrRate).toLocaleString('en-IN') : null;

  return (
    <div className={`inline-flex items-baseline gap-1.5 ${className}`}>
      <span className={`${sizeClasses[size] || sizeClasses.md} text-ink tabular-nums`}>
        {formattedMatic} <span className="text-xs font-heading font-medium text-forest">{currency}</span>
      </span>

      {showInr && inrAmount && (
        <span className="text-xs text-ink/50 tabular-nums">
          (~₹{inrAmount})
        </span>
      )}
    </div>
  );
}
