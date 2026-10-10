import React, { useState, useEffect, useRef } from 'react';
import { getThreads, getMessages, sendMessage } from '../api/threads.js';
import { draftAgreement } from '../api/agreements.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import AddressBadge from '../components/common/AddressBadge.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import { formatRelativeTime } from '../lib/formatters.js';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  Loader2,
  User,
  ArrowRight
} from 'lucide-react';

export default function ChatPage({ activeThreadId, onOpenDraftReview }) {
  const { address } = useWallet();
  const toast = useToast();

  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(activeThreadId || null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);

  const messagesEndRef = useRef(null);

  // Load threads
  const loadThreadsList = async () => {
    try {
      const data = await getThreads();
      setThreads(data || []);
      if (!selectedThreadId && data && data.length > 0) {
        setSelectedThreadId(data[0].id);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingThreads(false);
    }
  };

  useEffect(() => {
    loadThreadsList();
  }, []);

  // Sync prop changes
  useEffect(() => {
    if (activeThreadId) {
      setSelectedThreadId(activeThreadId);
    }
  }, [activeThreadId]);

  // Load and poll messages for selected thread every 5 seconds
  useEffect(() => {
    if (!selectedThreadId) return;

    let isMounted = true;
    const fetchMsgs = async () => {
      try {
        const msgs = await getMessages(selectedThreadId);
        if (isMounted) {
          setMessages(msgs || []);
        }
      } catch (err) {
        console.warn('Poll error:', err);
      }
    };

    fetchMsgs();
    const interval = setInterval(fetchMsgs, 5000); // Poll every 5 seconds as specified!

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedThreadId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedThreadId) return;

    try {
      setIsSending(true);
      const newMsg = await sendMessage(selectedThreadId, inputText.trim());
      setMessages(prev => [...prev, newMsg]);
      setInputText('');
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateAgreement = async () => {
    if (!selectedThreadId) return;

    try {
      setIsDrafting(true);
      toast.info('AI is analyzing messages and structuring AgreementTerms...');
      const result = await draftAgreement(selectedThreadId);
      toast.success('Agreement terms drafted by AI! Redirecting to review...');
      if (onOpenDraftReview) {
        onOpenDraftReview(result.agreementId);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate AI agreement draft');
    } finally {
      setIsDrafting(false);
    }
  };

  const currentThread = threads.find(t => t.id === selectedThreadId);
  const counterparty = currentThread?.participants?.find(p => p.toLowerCase() !== address?.toLowerCase()) || currentThread?.participants?.[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-160px)] min-h-[580px]">
        {/* Left: Threads List */}
        <div className="md:col-span-4 flex flex-col bg-surface-900/70 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-400" />
              Chat Threads
            </h2>
            <span className="text-xs text-slate-400 font-mono">{threads.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2">
            {isLoadingThreads ? (
              <div className="p-4 text-center text-xs text-slate-500">Loading threads...</div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No active conversations. Start a chat from any community post!
              </div>
            ) : (
              threads.map(t => {
                const other = t.participants?.find(p => p.toLowerCase() !== address?.toLowerCase()) || t.participants?.[0];
                const isSelected = t.id === selectedThreadId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedThreadId(t.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-surface-800 border border-teal-500/30 shadow-md'
                        : 'hover:bg-surface-850 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <AddressBadge address={other} chars={3} showExplorer={false} />
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatRelativeTime(t.updatedAt)}
                      </span>
                    </div>
                    {t.postTitle && (
                      <span className="text-xs font-semibold text-slate-300 truncate">
                        {t.postTitle}
                      </span>
                    )}
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {t.lastMessage || 'No messages yet'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Message Window */}
        <div className="md:col-span-8 flex flex-col bg-surface-900/70 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          {currentThread ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-800 bg-surface-950/40 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Consultation with</span>
                      <AddressBadge address={counterparty} chars={4} />
                    </div>
                    {currentThread.postTitle && (
                      <p className="text-xs font-semibold text-slate-300 truncate max-w-sm">
                        {currentThread.postTitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* AI Draft Button */}
                <Button
                  variant="accent"
                  size="sm"
                  onClick={handleGenerateAgreement}
                  isLoading={isDrafting}
                  disabled={messages.length === 0}
                  icon={Bot}
                  className="shadow-glow-indigo"
                >
                  Generate Agreement with AI
                </Button>
              </div>

              {/* AI helper banner if thread has enough context */}
              {messages.length >= 2 && (
                <div className="bg-indigo-950/30 border-b border-indigo-500/20 px-4 py-2 flex items-center justify-between text-xs text-indigo-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    AI has parsed scope & milestones. Ready to generate draft!
                  </span>
                  <button
                    onClick={handleGenerateAgreement}
                    className="underline hover:text-indigo-200 font-semibold"
                  >
                    Draft now &rarr;
                  </button>
                </div>
              )}

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
                    <Bot className="w-8 h-8 text-slate-600" />
                    <p className="text-sm">Start discussing your project scope and milestones here.</p>
                    <p className="text-xs text-slate-600 max-w-xs">
                      The AI service analyzes your messages to formulate an escrow agreement automatically.
                    </p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = address && msg.sender?.toLowerCase() === address.toLowerCase();
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400 font-mono">
                          <span>{isMe ? 'You' : `${msg.sender?.substring(0, 6)}...`}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(msg.ts)}</span>
                        </div>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isMe
                              ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-tr-sm shadow-md'
                              : 'bg-surface-800 text-slate-100 rounded-tl-sm border border-slate-750'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input box */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-surface-950/40 flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type message, clarify milestones, deadlines..."
                  className="flex-1 bg-surface-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSending}
                  disabled={!inputText.trim()}
                  icon={Send}
                >
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Select or open a thread to view messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
