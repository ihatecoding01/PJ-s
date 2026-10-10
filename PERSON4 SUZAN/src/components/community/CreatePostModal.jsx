import React, { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { createPost } from '../../api/posts.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useWallet } from '../../context/WalletContext.jsx';

export default function CreatePostModal({ isOpen, onClose, onPostCreated }) {
  const toast = useToast();
  const { isConnected, connectWallet } = useWallet();

  const [type, setType] = useState('JOB');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      toast.warning('Please connect wallet first');
      connectWallet();
      return;
    }
    if (!title.trim() || !description.trim() || !budget.trim()) {
      toast.error('Please fill in title, description, and budget');
      return;
    }

    try {
      setIsSubmitting(true);
      const skills = skillsInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const postData = {
        type,
        title: title.trim(),
        description: description.trim(),
        budget: budget.includes('MATIC') ? budget.trim() : `${budget.trim()} MATIC`,
        skills
      };

      const newPost = await createPost(postData);
      toast.success('Post created successfully in the community!');
      onPostCreated(newPost);
      onClose();

      // Reset
      setTitle('');
      setDescription('');
      setBudget('');
      setSkillsInput('');
    } catch (err) {
      toast.error(err.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Community Post">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Post Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('JOB')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                type === 'JOB'
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-surface-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              Hiring: Job Opportunity
            </button>
            <button
              type="button"
              onClick={() => setType('SERVICE')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                type === 'SERVICE'
                  ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                  : 'bg-surface-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              Offering: Freelance Service
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'JOB' ? 'e.g. Solidity Escrow Developer' : 'e.g. Fullstack React & Ethers dApp Development'}
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
            required
          />
        </div>

        {/* Budget */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Budget / Price
          </label>
          <input
            type="text"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. 2.5 MATIC"
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
            required
          />
        </div>

        {/* Skills */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Required Skills (comma separated)
          </label>
          <input
            type="text"
            value={skillsInput}
            onChange={(e) => setSkillsInput(e.target.value)}
            placeholder="React, Solidity, Hardhat, Ethers.js"
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Description & Scope
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Outline requirements, milestones, expected deliverables, and repo links..."
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 resize-none"
            required
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Publish Post
          </Button>
        </div>
      </form>
    </Modal>
  );
}
