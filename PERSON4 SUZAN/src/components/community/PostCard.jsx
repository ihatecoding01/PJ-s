import React from 'react';
import { Card, Badge, Button } from '../ui/index.js';
import AddressChip from '../ui/AddressChip.jsx';
import { formatRelativeTime } from '../../lib/formatters.js';
import { MessageSquare, Send, Coins, Users } from 'lucide-react';
import { useWallet } from '../../context/WalletContext.jsx';
import { createThread } from '../../api/threads.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function PostCard({ post, onSelect, onSelectPost, onStartChat }) {
  const { address } = useWallet();
  const toast = useToast();

  const handleSelect = onSelectPost || onSelect;

  const authorAddress = typeof post.author === 'object' && post.author !== null
    ? (post.author.walletAddress || '')
    : (post.author || post.creatorAddress || '');

  const isAuthor = address && authorAddress && address.toLowerCase() === authorAddress.toLowerCase();

  const handleStartChat = async (e) => {
    e.stopPropagation();
    try {
      const targetAddr = authorAddress || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
      const thread = await createThread({
        otherAddress: targetAddr,
        recipientId: targetAddr,
        subject: `Consultation: ${post.title}`,
        postId: post.id
      });
      toast.success('Chat thread opened with post author');
      if (onStartChat) onStartChat(thread.id);
    } catch (err) {
      toast.error(err.message || 'Could not start chat');
    }
  };

  return (
    <Card hoverEffect className="flex flex-col justify-between h-full bg-white border border-gray hover:border-forest/40 transition-all">
      <div className="space-y-3.5">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge status={post.type === 'JOB' ? 'pending' : 'success'}>
              {post.type}
            </Badge>
            <span className="text-xs text-ink/50 font-mono">
              {formatRelativeTime(post.createdAt)}
            </span>
          </div>
          {authorAddress && (
            <AddressChip address={authorAddress} showExplorer={false} />
          )}
        </div>

        {/* Title & Description with high-contrast text */}
        <div>
          <h3
            onClick={() => handleSelect && handleSelect(post)}
            className="text-base sm:text-lg font-heading font-bold text-ink hover:text-forest transition-colors cursor-pointer line-clamp-2"
          >
            {post.title}
          </h3>
          <p className="text-xs text-ink/70 mt-1.5 line-clamp-3 leading-relaxed font-sans">
            {post.description}
          </p>
        </div>

        {/* Required Skills */}
        {post.skills && post.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.skills.map((skill, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded-full bg-sage text-forest border border-forest/10 font-mono font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-4 mt-4 border-t border-gray flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-forest font-bold font-mono">
            <Coins className="w-4 h-4 text-forest shrink-0" />
            <span>{post.budget}</span>
          </div>
          <div className="flex items-center gap-1 text-ink/60">
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
            onClick={(e) => {
              e.stopPropagation();
              if (handleSelect) handleSelect(post);
            }}
            icon={Send}
          >
            View Proposals
          </Button>
        </div>
      </div>
    </Card>
  );
}
