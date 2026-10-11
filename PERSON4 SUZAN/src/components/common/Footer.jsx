import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';

export default function Footer() {
  const explorerUrl = import.meta.env.VITE_EXPLORER_URL || 'https://amoy.polygonscan.com';

  return (
    <footer className="border-t border-gray bg-white mt-16 text-xs text-ink/60 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-forest flex items-center justify-center text-ivory">
              <ShieldCheck className="w-4 h-4 text-coral" />
            </div>
            <div>
              <p className="font-heading font-bold text-ink tracking-tight">SANKALP</p>
              <p className="text-[11px] text-ink/60">Bridging Work and Trust</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <span className="text-ink/60 font-mono">
              Polygon Amoy · MATIC Escrow
            </span>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-forest hover:underline"
            >
              Block Explorer <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
