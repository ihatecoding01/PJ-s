import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { createPost } from '../../api/posts.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useWallet } from '../../context/WalletContext.jsx';

export default function CreatePostModal({ isOpen, onClose, onPostCreated, onCreated }) {
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
      
      // Support both callback prop conventions safely
      if (typeof onPostCreated === 'function') onPostCreated(newPost);
      if (typeof onCreated === 'function') onCreated(newPost);
      
      onClose();

      // Reset form
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
    <Modal isOpen={isOpen} onClose={onClose} title="Create Community Post" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-ink">
        {/* Post Type Toggle */}
        <div>
          <label className="block text-xs font-heading font-semibold text-ink/80 uppercase tracking-wider mb-1.5">
            Post Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('JOB')}
              className={`py-2 px-3 rounded-[10px] text-xs font-heading font-semibold border transition-all ${
                type === 'JOB'
                  ? 'bg-forest text-ivory border-forest shadow-sm'
                  : 'bg-sage/40 border-gray text-ink/70 hover:bg-sage hover:text-ink'
              }`}
            >
              Hiring: Job Opportunity
            </button>
            <button
              type="button"
              onClick={() => setType('SERVICE')}
              className={`py-2 px-3 rounded-[10px] text-xs font-heading font-semibold border transition-all ${
                type === 'SERVICE'
                  ? 'bg-forest text-ivory border-forest shadow-sm'
                  : 'bg-sage/40 border-gray text-ink/70 hover:bg-sage hover:text-ink'
              }`}
            >
              Offering: Freelance Service
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-heading font-semibold text-ink/80 uppercase tracking-wider mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'JOB' ? 'e.g. Fullstack React & Solidity Escrow Engineer' : 'e.g. Smart Contract Audit & Optimization'}
            className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 transition-all font-sans"
            required
          />
        </div>

        {/* Budget */}
        <div>
          <label className="block text-xs font-heading font-semibold text-ink/80 uppercase tracking-wider mb-1.5">
            Budget / Price
          </label>
          <input
            type="text"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. 2.5 MATIC"
            className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 transition-all font-mono"
            required
          />
        </div>

        {/* Skills */}
        <div>
          <label className="block text-xs font-heading font-semibold text-ink/80 uppercase tracking-wider mb-1.5">
            Required Skills (comma separated)
          </label>
          <input
            type="text"
            value={skillsInput}
            onChange={(e) => setSkillsInput(e.target.value)}
            placeholder="React, Solidity, Hardhat, Ethers.js"
            className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 transition-all font-sans"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-heading font-semibold text-ink/80 uppercase tracking-wider mb-1.5">
            Description & Scope
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Outline requirements, milestones, expected deliverables, and repo links..."
            className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 transition-all resize-none font-sans"
            required
          />
        </div>

        {/* Actions */}
        <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Publish Post
          </Button>
        </div>
      </form>
    </Modal>
  );
}
