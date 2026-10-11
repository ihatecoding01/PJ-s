import React from 'react';

export default function Card({
  children,
  variant = 'default',
  className = '',
  ...props
}) {
  const variantClasses = {
    default: 'bg-white border border-gray rounded-card shadow-card',
    sage: 'bg-sage border border-sage-light rounded-card',
    forest: 'bg-forest text-ivory rounded-card border border-forest shadow-sm',
    highlight: 'bg-sage-light/60 border border-forest/20 rounded-card',
    brutal: 'bg-white border-2 border-ink rounded-card shadow-brutal',
  };

  return (
    <div
      className={`${variantClasses[variant] || variantClasses.default} p-5 md:p-6 transition-all duration-150 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
