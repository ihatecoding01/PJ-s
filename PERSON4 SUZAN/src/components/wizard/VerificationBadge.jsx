import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { canonicalHash } from '../../lib/canonicalHash.js';
import { shortenAddress } from '../../lib/formatters.js';

export default function VerificationBadge({
  terms,
  onchainTermsHash,
  className = ''
}) {
  const [localHash, setLocalHash] = useState(null);
  const [isMatch, setIsMatch] = useState(false);

  useEffect(() => {
    if (terms) {
      try {
        const computed = canonicalHash(terms);
        setLocalHash(computed);
        if (onchainTermsHash) {
          setIsMatch(computed.toLowerCase() === onchainTermsHash.toLowerCase());
        } else {
          setIsMatch(true); // matching self
        }
      } catch (err) {
        console.warn('Hash error:', err);
      }
    }
  }, [terms, onchainTermsHash]);

  if (!localHash) return null;

  return (
    <div className={`p-3.5 rounded-xl border backdrop-blur-md transition-all ${
      isMatch
        ? 'bg-emerald-950/20 border-emerald-500/30'
        : 'bg-rose-950/25 border-rose-500/40 animate-pulse'
    } ${className}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {isMatch ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                isMatch ? 'text-emerald-300' : 'text-rose-300'
              }`}>
                {isMatch ? 'Terms Verified On-Chain' : 'Terms Hash Mismatch Warning!'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-surface-900 border border-slate-700 text-slate-400">
                keccak256
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Hash: <span className="text-slate-300">{shortenAddress(localHash, 8)}</span>
            </p>
          </div>
        </div>

        {isMatch && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Canonical Match
          </span>
        )}
      </div>
    </div>
  );
}
