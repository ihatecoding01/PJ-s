import React, { useRef } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import AddressChip from '../ui/AddressChip.jsx';
import { generateContractCertificate } from '../../lib/ipfsHelper.js';
import {
  Printer,
  Download,
  ShieldCheck,
  FileCheck2,
  ExternalLink,
  Lock,
  Globe,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';

export default function ExportContractModal({ isOpen, onClose, agreement }) {
  const toast = useToast();
  const printAreaRef = useRef(null);

  if (!agreement) return null;

  const terms = agreement.terms || {};
  const cert = generateContractCertificate(agreement);
  const explorerUrl = import.meta.env.VITE_EXPLORER_URL || 'https://amoy.polygonscan.com';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(terms, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sankalp-Agreement-${cert.certificateId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Agreement terms JSON downloaded');
  };

  const handleCopyHash = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verifiable Legal Agreement Certificate"
      subtitle="Canonical cryptographic contract bound by Keccak-256 and Smart Escrow"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Printable Certificate Sheet */}
        <div
          ref={printAreaRef}
          className="bg-white border-2 border-ink rounded-card p-6 sm:p-8 space-y-6 shadow-brutal print:m-0 print:border-none print:shadow-none"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b-2 border-ink gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-forest text-ivory flex items-center justify-center font-heading font-bold shadow-sm">
                <ShieldCheck className="w-6 h-6 text-coral" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-lg text-ink tracking-tight">SANKALP</h2>
                <p className="text-xs text-forest font-medium">Smart Agreements & Escrow Certificate</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-mono uppercase text-ink/50 block">Certificate ID</span>
              <span className="font-mono text-xs font-bold text-ink bg-sage px-2 py-0.5 rounded border border-gray">
                {cert.certificateId}
              </span>
              <span className="text-[10px] text-ink/50 block mt-1">
                Issued: {new Date(cert.issuedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Project Details */}
          <div>
            <h3 className="font-heading font-bold text-lg text-ink">{terms.title || 'Freelance Engagement'}</h3>
            <p className="text-xs text-ink/70 mt-1 leading-relaxed">
              {terms.description || 'Agreement executed under deterministic non-custodial smart contract rules.'}
            </p>
          </div>

          {/* Parties & Escrow Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-[10px] bg-ivory border border-gray text-xs">
            <div>
              <span className="font-heading font-semibold text-ink/60 uppercase text-[10px] block">Client Signer</span>
              <div className="mt-1 flex items-center gap-1.5 font-mono font-medium text-ink">
                <span>{cert.client}</span>
              </div>
            </div>
            <div>
              <span className="font-heading font-semibold text-ink/60 uppercase text-[10px] block">Freelancer Signer</span>
              <div className="mt-1 flex items-center gap-1.5 font-mono font-medium text-ink">
                <span>{cert.freelancer}</span>
              </div>
            </div>
            <div>
              <span className="font-heading font-semibold text-ink/60 uppercase text-[10px] block">Escrow Valuation</span>
              <span className="font-heading font-bold text-sm text-forest mt-0.5 block">
                {cert.totalAmount} {cert.currency}
              </span>
            </div>
            <div>
              <span className="font-heading font-semibold text-ink/60 uppercase text-[10px] block">On-Chain State</span>
              <span className="font-medium text-ink mt-0.5 block">
                {cert.onchainId !== 'PENDING_DEPLOYMENT' ? `Agreement #${cert.onchainId}` : 'Pre-flight Draft'}
              </span>
            </div>
          </div>

          {/* Cryptographic Verification Keys */}
          <div className="p-4 rounded-[10px] bg-sage/30 border border-forest/20 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-heading font-semibold text-forest flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Canonical Terms Hash (Keccak-256)
              </span>
              <button
                onClick={() => handleCopyHash(cert.termsHash, 'Terms hash')}
                className="text-forest hover:underline flex items-center gap-1 text-[11px]"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <p className="font-mono text-[11px] text-ink/80 break-all bg-white p-2 rounded border border-gray/80">
              {cert.termsHash}
            </p>

            <div className="flex items-center justify-between pt-1">
              <span className="font-heading font-semibold text-forest flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Decentralized IPFS CID
              </span>
              <button
                onClick={() => handleCopyHash(cert.ipfsUri, 'IPFS URI')}
                className="text-forest hover:underline flex items-center gap-1 text-[11px]"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <p className="font-mono text-[11px] text-ink/80 break-all bg-white p-2 rounded border border-gray/80">
              {cert.ipfsUri}
            </p>
          </div>

          {/* Milestones Schedule */}
          <div className="space-y-3">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-ink/70">
              Milestone Deliverable Schedule ({terms.milestones?.length || 0})
            </h4>
            <div className="border border-gray rounded-[10px] overflow-hidden text-xs">
              <div className="bg-sage/40 grid grid-cols-12 p-2.5 font-heading font-semibold text-ink border-b border-gray">
                <span className="col-span-1">#</span>
                <span className="col-span-6">Milestone Title & Scope</span>
                <span className="col-span-2 text-right">Allocation</span>
                <span className="col-span-3 text-right">Deadline</span>
              </div>
              {(terms.milestones || []).map((m, idx) => (
                <div key={idx} className="grid grid-cols-12 p-2.5 border-b border-gray/60 last:border-0 hover:bg-ivory">
                  <span className="col-span-1 font-mono font-bold text-ink/50">{idx + 1}</span>
                  <div className="col-span-6">
                    <span className="font-heading font-semibold text-ink block">{m.title}</span>
                    <span className="text-[11px] text-ink/60">{m.description}</span>
                  </div>
                  <span className="col-span-2 text-right font-mono font-bold text-forest">
                    {m.amount} {terms.currency}
                  </span>
                  <span className="col-span-3 text-right font-mono text-[11px] text-ink/60">
                    {m.deadline ? new Date(m.deadline).toLocaleDateString() : 'TBD'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Governing Rules */}
          <div className="text-[11px] text-ink/60 leading-relaxed border-t border-gray pt-4 space-y-1">
            <p><strong>Arbitration & Enforcement:</strong> Bound to FairWork smart contract on Polygon. Any disputes are automatically arbitrated by a 3-member arbitrator pool with median share calculation.</p>
            <p><strong>Review Window:</strong> {terms.reviewWindowDays || 5} days silence allows freelancer auto-claim. Late penalty rate: {terms.latePenaltyBpsPerDay || 100} bps/day (max {terms.maxLatePenaltyBps || 3000} bps).</p>
          </div>

          {/* Signatures Verified Badge */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-ink">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-forest" />
              <span className="text-xs font-heading font-bold text-ink">Cryptographically Bound & Verified</span>
            </div>
            <span className="text-xs font-mono text-ink/50">Polygon Amoy & Localhost</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-gray">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadJson}
            icon={Download}
          >
            Download Terms JSON
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            icon={Printer}
          >
            Print / Save as PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}
