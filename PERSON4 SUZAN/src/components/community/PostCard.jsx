import React from 'react';
import Card from '../common/Card.jsx';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import AddressBadge from '../common/AddressBadge.jsx';
import { formatRelativeTime } from '../../lib/formatters.js';
import { MessageSquare, Send, Coins, Users } from 'lucide-react';
import { useWallet } from '../../context/WalletContext.jsx';
import { createThread } from '../../api/threads.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function PostCard({ post, onSelectPost, onStartChat }) {
  const { address } = useWallet();
  const toast = useToast();

  const authorAddress = typeof post.author === 'object' && post.author !== null
    ? (post.author.walletAddress || '')
    : (post.author || '');

  const isAuthor = address && authorAddress && address.toLowerCase() === authorAddress.toLowerCase();

  const handleStartChat = async (e) => {
    e.stopPropagation();
    try {
      const thread = await createThread({
        otherAddress: authorAddress,
        postId: post.id
      });
      toast.success('Chat thread opened with post author');
      if (onStartChat) onStartChat(thread.id);
    } catch (err) {
      toast.error(err.message || 'Could not start chat');
    }
  };

  return (
    <Card hoverEffect className="flex flex-col justify-between">
      <div className="space-y-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge label={post.type} variant={post.type} size="sm" />
            <span className="text-xs text-slate-400 font-mono">
              {formatRelativeTime(post.createdAt)}
            </span>
          </div>
          <AddressBadge address={authorAddress} chars={3} showExplorer={false} />
        </div>

        <div>
          <h3
            onClick={() => onSelectPost(post)}
            className="text-base sm:text-lg font-bold text-slate-100 hover:text-teal-300 transition-colors cursor-pointer line-clamp-2"
          >
            {post.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-3 leading-relaxed">
            {post.description}
          </p>
        </div>

        {/* Skills */}
        {post.skills && post.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.skills.map((skill, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded-md bg-surface-800 text-slate-300 border border-slate-700/60 font-mono"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="pt-5 mt-5 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-teal-300 font-bold font-mono">
            <Coins className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{post.budget}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Users className="w-3.5 h-3.5" />
            <span>{post.proposalsCount || 0} Proposals</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isAuthor && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleStartChat}
              icon={MessageSquare}
            >
              Start Chat
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectPost(post)}
            icon={Send}
          >
            {isAuthor ? 'View Proposals' : 'Proposal'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
