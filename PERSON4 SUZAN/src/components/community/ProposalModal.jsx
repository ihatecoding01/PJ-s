import React, { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { createProposal } from '../../api/posts.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useWallet } from '../../context/WalletContext.jsx';

export default function ProposalModal({ isOpen, onClose, post, onProposalSubmitted }) {
  const toast = useToast();
  const { isConnected, connectWallet } = useWallet();

  const [price, setPrice] = useState(post?.budget || '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      toast.warning('Connect wallet first');
      connectWallet();
      return;
    }
    if (!price.trim() || !message.trim()) {
      toast.error('Please enter proposed price and proposal message');
      return;
    }

    try {
      setIsSubmitting(true);
      const proposal = await createProposal(post.id, {
        price: price.includes('MATIC') ? price.trim() : `${price.trim()} MATIC`,
        message: message.trim()
      });
      toast.success('Proposal submitted successfully!');
      onProposalSubmitted(proposal);
      onClose();
      setMessage('');
    } catch (err) {
      toast.error(err.message || 'Failed to submit proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!post) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Submit Proposal for "${post.title}"`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Proposed Price / Rate
          </label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 2.5 MATIC"
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Proposal Pitch & Plan
          </label>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Highlight your Web3 experience, proposed milestone milestones, timeline, and GitHub profile..."
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 resize-none"
            required
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Send Proposal
          </Button>
        </div>
      </form>
    </Modal>
  );
}
