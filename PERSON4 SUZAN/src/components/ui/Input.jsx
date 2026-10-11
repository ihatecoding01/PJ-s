import React from 'react';

export function Input({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5 font-heading">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full bg-white text-ink border ${error ? 'border-coral ring-1 ring-coral' : 'border-gray'} rounded-[10px] px-3.5 py-2.5 text-sm transition-colors placeholder:text-ink/40 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 disabled:bg-ivory disabled:text-ink/40 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-coral font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-ink/60">{helperText}</p>
      ) : null}
    </div>
  );
}

export function Textarea({
  label,
  error,
  helperText,
  rows = 3,
  className = '',
  id,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5 font-heading">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={`w-full bg-white text-ink border ${error ? 'border-coral ring-1 ring-coral' : 'border-gray'} rounded-[10px] px-3.5 py-2.5 text-sm transition-colors placeholder:text-ink/40 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 disabled:bg-ivory disabled:text-ink/40 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-coral font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-ink/60">{helperText}</p>
      ) : null}
    </div>
  );
}

export function Select({
  label,
  error,
  helperText,
  children,
  className = '',
  id,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5 font-heading">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={`w-full bg-white text-ink border ${error ? 'border-coral ring-1 ring-coral' : 'border-gray'} rounded-[10px] px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 disabled:bg-ivory disabled:text-ink/40 disabled:cursor-not-allowed ${className}`}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-coral font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-ink/60">{helperText}</p>
      ) : null}
    </div>
  );
}

export default { Input, Textarea, Select };
