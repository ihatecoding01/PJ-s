import React, { useState, useEffect } from 'react';
import { getPosts, getProposals } from '../api/posts.js';
import { mockStore } from '../mock/mockStore.js';
import PostCard from '../components/community/PostCard.jsx';
import CreatePostModal from '../components/community/CreatePostModal.jsx';
import ProposalModal from '../components/community/ProposalModal.jsx';
import { Card, Button, Badge, Modal, AmountDisplay, EmptyState } from '../components/ui/index.js';
import AddressChip from '../components/ui/AddressChip.jsx';
import { Search, Plus, Filter, MessageSquare, Send, Sparkles, Briefcase } from 'lucide-react';
import { createThread } from '../api/threads.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatRelativeTime } from '../lib/formatters.js';

export default function CommunityPage({
  onNavigateToChat,
  externalSearchQuery,
  isCreateModalForcedOpen,
  onCloseCreateModal,
}) {
  const { address } = useWallet();
  const toast = useToast();

  const [posts, setPosts] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postProposals, setPostProposals] = useState([]);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  useEffect(() => {
    if (isCreateModalForcedOpen) {
      setIsCreateOpen(true);
    }
  }, [isCreateModalForcedOpen]);

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  const fetchPostsList = async () => {
    try {
      setIsLoading(true);
      let data = [];
      try {
        data = await getPosts({
          type: filterType || undefined,
          q: searchQuery || undefined
        });
      } catch (err) {
        console.warn('Backend posts fetch error, falling back:', err);
        data = (mockStore.data && mockStore.data.posts) || [];
      }
      setPosts(data || []);
    } catch (err) {
      toast.error('Could not load projects feed');
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
      const fallbackAddr = selectedPost ? (
        typeof selectedPost.author === 'object' && selectedPost.author !== null
          ? (selectedPost.author.walletAddress || '')
          : (selectedPost.author || selectedPost.creatorAddress || '')
      ) : '';
      const target = otherAddr || fallbackAddr || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

      const thread = await createThread({
        otherAddress: target,
        recipientId: target,
        subject: `Consultation: ${selectedPost?.title || 'Project Discussion'}`,
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
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
            Projects & Community Marketplace
          </h1>
          <p className="text-sm text-ink/60 mt-1">
            Discover verified jobs and offerings backed by SANKALP smart milestone escrow.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          icon={Plus}
          className="self-start sm:self-auto"
        >
          Create Project Post
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-card border border-gray shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-ink/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, skills, keywords..."
            className="w-full bg-ivory border border-gray rounded-[10px] pl-9 pr-3.5 py-2 text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 transition-all"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: '', label: 'All Listings' },
            { id: 'JOB', label: '💼 Jobs' },
            { id: 'SERVICE', label: '🛠 Services' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3.5 py-1.5 rounded-[8px] text-xs font-heading font-medium whitespace-nowrap transition-all ${
                filterType === f.id
                  ? 'bg-forest text-ivory font-semibold shadow-sm'
                  : 'bg-sage/50 text-ink/70 border border-gray hover:text-ink hover:bg-sage'
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
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="h-64 rounded-card bg-white border border-gray p-6 animate-pulse space-y-4">
              <div className="h-5 bg-gray rounded w-2/3" />
              <div className="h-4 bg-gray/60 rounded w-full" />
              <div className="h-4 bg-gray/60 rounded w-4/5" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No listings found"
          description="Try adjusting your keywords or category filters, or create a new project listing."
          actionLabel="Create Project"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => (
            <div
              key={post.id}
              onClick={() => handleOpenPostDetail(post)}
              className="cursor-pointer"
            >
              <PostCard
                post={post}
                onSelect={handleOpenPostDetail}
                onSelectPost={handleOpenPostDetail}
                onStartChat={onNavigateToChat}
              />
            </div>
          ))}
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (() => {
        const postAuthor = typeof selectedPost.author === 'object' && selectedPost.author !== null
          ? (selectedPost.author.walletAddress || '')
          : (selectedPost.author || selectedPost.creatorAddress || '');

        return (
          <Modal
            isOpen={Boolean(selectedPost)}
            onClose={() => setSelectedPost(null)}
            title={selectedPost.title}
            subtitle={`Posted by ${postAuthor ? postAuthor.slice(0, 8) + '...' : 'Anonymous'} · ${formatRelativeTime(selectedPost.createdAt)}`}
            maxWidth="max-w-2xl"
          >
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge status={selectedPost.type === 'JOB' ? 'pending' : 'success'}>
                  {selectedPost.type}
                </Badge>
                <div className="flex items-center gap-1.5 text-xs text-ink font-semibold">
                  <span>Budget:</span>
                  <AmountDisplay amount={selectedPost.budget} size="sm" />
                </div>
                {postAuthor && <AddressChip address={postAuthor} />}
              </div>

              <div className="space-y-2">
                <h4 className="font-heading font-semibold text-xs uppercase tracking-wider text-ink/60">
                  Description & Deliverables
                </h4>
                <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line bg-ivory p-4 rounded-card border border-gray font-sans">
                  {selectedPost.description}
                </p>
              </div>

              {selectedPost.skills && selectedPost.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedPost.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="text-xs font-mono px-2 py-0.5 rounded-full bg-sage text-forest border border-forest/10"
                    >
                      #{skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray">
                <div className="text-xs text-ink/60">
                  {postProposals.length} proposal(s) submitted
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStartChatFromDetail(postAuthor, selectedPost.id)}
                    icon={MessageSquare}
                  >
                    Start Chat
                  </Button>

                  {(!address || !postAuthor || postAuthor.toLowerCase() !== address?.toLowerCase()) && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setIsProposalModalOpen(true);
                      }}
                      icon={Send}
                    >
                      Submit Proposal
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={handleCloseCreate}
        onPostCreated={() => {
          handleCloseCreate();
          fetchPostsList();
        }}
        onCreated={() => {
          handleCloseCreate();
          fetchPostsList();
        }}
      />

      {/* Submit Proposal Modal */}
      {selectedPost && (
        <ProposalModal
          isOpen={isProposalModalOpen}
          onClose={() => setIsProposalModalOpen(false)}
          post={selectedPost}
          onSubmitted={() => {
            setIsProposalModalOpen(false);
            handleOpenPostDetail(selectedPost);
          }}
        />
      )}
    </div>
  );
}
