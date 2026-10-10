import React, { useState, useEffect } from 'react';
import { getPosts, getProposals } from '../api/posts.js';
import PostCard from '../components/community/PostCard.jsx';
import CreatePostModal from '../components/community/CreatePostModal.jsx';
import ProposalModal from '../components/community/ProposalModal.jsx';
import Button from '../components/common/Button.jsx';
import AddressBadge from '../components/common/AddressBadge.jsx';
import Badge from '../components/common/Badge.jsx';
import Modal from '../components/common/Modal.jsx';
import { Search, Plus, Filter, MessageSquare, Send, Sparkles } from 'lucide-react';
import { createThread } from '../api/threads.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatRelativeTime } from '../lib/formatters.js';

export default function CommunityPage({ onNavigateToChat }) {
  const { address } = useWallet();
  const toast = useToast();

  const [posts, setPosts] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postProposals, setPostProposals] = useState([]);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  const fetchPostsList = async () => {
    try {
      setIsLoading(true);
      const data = await getPosts({
        type: filterType || undefined,
        q: searchQuery || undefined
      });
      setPosts(data || []);
    } catch (err) {
      toast.error('Could not load community posts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPostsList();
  }, [filterType, searchQuery]);

  const handleOpenPostDetail = async (post) => {
    setSelectedPost(post);
    try {
      const props = await getProposals(post.id);
      setPostProposals(props || []);
    } catch {
      setPostProposals([]);
    }
  };

  const handleStartChatFromDetail = async (otherAddr, postId) => {
    try {
      const thread = await createThread({
        otherAddress: otherAddr,
        postId
      });
      toast.success('Chat thread opened');
      setSelectedPost(null);
      if (onNavigateToChat) onNavigateToChat(thread.id);
    } catch (err) {
      toast.error(err.message || 'Could not start chat');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Community Marketplace
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse verified Web3 job listings and freelance offerings with built-in milestone escrow.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          icon={Plus}
          className="self-start sm:self-auto"
        >
          Create Post
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface-900/60 p-3 rounded-2xl border border-slate-800">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts, skills, keywords..."
            className="w-full bg-surface-800/80 border border-slate-700/60 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: '', label: 'All Listings' },
            { id: 'JOB', label: '💼 Jobs' },
            { id: 'SERVICE', label: '🛠 Services' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                filterType === f.id
                  ? 'bg-teal-500/15 border border-teal-500/40 text-teal-300 font-semibold'
                  : 'bg-surface-800 text-slate-400 border border-transparent hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-64 rounded-2xl bg-surface-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-surface-900/30 rounded-2xl border border-slate-800/80">
          <p className="text-slate-400 text-sm">No listings found matching your search.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSearchQuery(''); setFilterType(''); }}
            className="mt-3"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onSelectPost={handleOpenPostDetail}
              onStartChat={(threadId) => onNavigateToChat(threadId)}
            />
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPostCreated={(newP) => {
          setPosts(prev => [newP, ...prev]);
        }}
      />

      {/* Post Detail & Proposals View Modal */}
      {selectedPost && (
        <Modal
          isOpen={Boolean(selectedPost)}
          onClose={() => setSelectedPost(null)}
          title={selectedPost.title}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge label={selectedPost.type} variant={selectedPost.type} />
                <span className="text-teal-300 font-mono font-bold text-sm bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                  Budget: {selectedPost.budget}
                </span>
              </div>
              <AddressBadge address={selectedPost.author} label="Author" />
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</h4>
              <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed bg-surface-800/40 p-4 rounded-xl border border-slate-800">
                {selectedPost.description}
              </p>
            </div>

            {selectedPost.skills?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Required Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPost.skills.map((s, idx) => (
                    <span key={idx} className="text-xs px-2.5 py-1 rounded bg-surface-800 text-slate-300 font-mono">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              {address?.toLowerCase() !== selectedPost.author?.toLowerCase() ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStartChatFromDetail(selectedPost.author, selectedPost.id)}
                    icon={MessageSquare}
                  >
                    Start Chat with Author
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsProposalModalOpen(true)}
                    icon={Send}
                  >
                    Send Proposal
                  </Button>
                </>
              ) : (
                <span className="text-xs text-slate-400 italic">You are the author of this post.</span>
              )}
            </div>

            {/* Proposals Section */}
            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-sm font-bold text-slate-200 mb-3 flex items-center justify-between">
                <span>Submitted Proposals</span>
                <span className="text-xs font-normal text-slate-400">{postProposals.length} total</span>
              </h4>

              {postProposals.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">No proposals submitted yet. Be the first to apply!</p>
              ) : (
                <div className="space-y-3">
                  {postProposals.map((prop) => (
                    <div key={prop.id} className="p-3.5 rounded-xl bg-surface-850/70 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AddressBadge address={prop.author} chars={3} showExplorer={false} />
                          <span className="text-xs font-semibold text-teal-300 font-mono">
                            {prop.price}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {formatRelativeTime(prop.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{prop.message}</p>
                      
                      {address?.toLowerCase() === selectedPost.author?.toLowerCase() && (
                        <div className="pt-1 flex justify-end">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleStartChatFromDetail(prop.author, selectedPost.id)}
                            icon={MessageSquare}
                          >
                            Chat with Proposer
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Send Proposal Modal */}
      {selectedPost && (
        <ProposalModal
          isOpen={isProposalModalOpen}
          onClose={() => setIsProposalModalOpen(false)}
          post={selectedPost}
          onProposalSubmitted={(newProp) => {
            setPostProposals(prev => [newProp, ...prev]);
            setSelectedPost(prev => prev ? { ...prev, proposalsCount: (prev.proposalsCount || 0) + 1 } : null);
          }}
        />
      )}
    </div>
  );
}
