import React from 'react';
import { Layers, Shield, Cpu, Code2, ExternalLink } from 'lucide-react';

export default function Footer() {
  const explorerUrl = import.meta.env.VITE_EXPLORER_URL || 'https://amoy.polygonscan.com';

  return (
    <footer className="border-t border-slate-800/80 bg-surface-950 mt-20 text-slate-400 text-xs py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <span className="font-bold text-slate-100 text-sm">FairWork Monorepo</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              Milestone-based decentralized freelance agreements with automated AI GitHub progress tracking and arbitrator governance.
            </p>
          </div>

          <div>
            <h4 className="text-slate-200 font-semibold mb-3 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-teal-400" /> Architecture
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>P1: Hardhat, Solidity 0.8.24 (Contracts)</li>
              <li>P2: Node 20, Express, ethers v6, Prisma (Backend)</li>
              <li>P3: Python 3.11, FastAPI, GitHub REST (AI Service)</li>
              <li>P4: React, Vite, Tailwind, ethers v6 (Frontend)</li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-200 font-semibold mb-3 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-400" /> Protocol & Network
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>Local Node: Hardhat (31337)</li>
              <li>Demo Network: Polygon Amoy Testnet (80002)</li>
              <li>Native Currency: MATIC (wei on-chain)</li>
              <li>Standard Fee: 100 bps (1.0%)</li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-200 font-semibold mb-3 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-400" /> Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-teal-400 transition-colors"
                >
                  Polygon Amoy Explorer <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <span className="text-slate-500">Schema Version 1.0 (agreement-terms.json)</span>
              </li>
              <li>
                <span className="text-slate-500">Hash Algorithm: keccak256(utf8(canonicalJSON))</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400">
          <p>© 2026 FairWork Protocol. Person 4 (Frontend Owner). Built with React + Vite + Tailwind + ethers v6.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-surface-900 border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" /> Verified On-Chain
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
