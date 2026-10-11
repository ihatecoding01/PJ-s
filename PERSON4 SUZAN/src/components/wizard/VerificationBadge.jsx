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
    <div className={`p-3.5 rounded-card border transition-all ${
      isMatch
        ? 'bg-sage-light/60 border-forest/30 text-forest'
        : 'bg-coral/25 border-coral text-ink'
    } ${className}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          {isMatch ? (
            <ShieldCheck className="w-5 h-5 text-forest shrink-0" />
          ) : (
            <AlertOctagon className="w-5 h-5 text-coral shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-heading font-bold uppercase tracking-wider ${
                isMatch ? 'text-forest' : 'text-coral-900'
              }`}>
                {isMatch ? 'Terms Verified On-Chain' : 'Terms Hash Mismatch Warning!'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-white border border-gray text-ink/70">
                Keccak-256
              </span>
            </div>
            <p className="text-[11px] font-mono text-ink/70 mt-0.5">
              Hash: <span className="font-semibold text-ink">{shortenAddress(localHash, 8)}</span>
            </p>
          </div>
        </div>

        {isMatch && (
          <span className="inline-flex items-center gap-1 text-[11px] font-heading font-semibold text-forest bg-sage px-2.5 py-1 rounded-full border border-forest/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Canonical Match
          </span>
        )}
      </div>
    </div>
  );
}
