import React, { useState } from 'react';
import Button from '../common/Button.jsx';
import { queryArbitratorEvidence } from '../../api/disputes.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  HelpCircle,
  FileCheck,
  CheckCircle2,
  Bookmark
} from 'lucide-react';

const SUGGESTED_QUERIES = [
  'Were automated test suites passing upon submission?',
  'Did the client provide design specifications before Day 5?',
  'Were revision requests within the agreed contract scope?',
  'Did the submission occur within allowable deadline & grace windows?'
];

export default function ArbitratorCrossExaminer({ disputeId = 'disp-1' }) {
  const toast = useToast();
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([
    {
      question: 'Did the submitted repository have passing test suites?',
      answer:
        'Yes. Automated verification records confirm that all 24 unit test suites executed with 100% pass rate. However, error handling assertions were omitted for simulated database connection timeouts.',
      cited_evidence: [
        'Jest Automated Test Execution Logs (commit a1b2c3)',
        'Server error logs in Client Evidence Attachment #1'
      ],
      timestamp: 'Initial Audit'
    }
  ]);

  const handleSendQuery = async (queryText) => {
    const textToSend = (queryText || question).trim();
    if (!textToSend) return;

    try {
      setIsLoading(true);
      const res = await queryArbitratorEvidence(disputeId, textToSend);

      const newEntry = {
        question: textToSend,
        answer: res.answer || res.data?.answer || 'No direct evidence answer available.',
        cited_evidence: res.cited_evidence || res.data?.cited_evidence || [
          'On-chain dispute ledger',
          'Agreement terms canonical hash'
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setHistory((prev) => [newEntry, ...prev]);
      setQuestion('');
      toast.success('Cross-examiner findings retrieved');
    } catch (err) {
      toast.error(err.message || 'Query failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-card border-2 border-forest/30 bg-white p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-[8px] bg-forest text-ivory">
            <MessageSquare className="w-5 h-5 text-coral" />
          </div>
          <div>
            <h4 className="text-sm font-heading font-bold text-ink flex items-center gap-2">
              Interactive Arbitrator Cross-Examiner
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sage text-forest font-mono">
                AI Q&A Tool
              </span>
            </h4>
            <p className="text-xs text-ink/60 mt-0.5">
              Ask natural questions to cross-examine claims, timestamps, and objective deliverable evidence.
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Quick Probes */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-heading font-semibold text-ink/50 uppercase tracking-wider block">
          Quick Inquiries
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_QUERIES.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendQuery(sq)}
              disabled={isLoading}
              className="text-[11px] px-2.5 py-1 rounded-full bg-sage/60 hover:bg-sage text-forest border border-forest/20 transition-colors font-medium text-left"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Query Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendQuery();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about the evidence, git diff, or timeline..."
            disabled={isLoading}
            className="w-full bg-ivory border border-gray rounded-[10px] pl-3.5 pr-10 py-2.5 text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest"
          />
          <HelpCircle className="w-4 h-4 text-ink/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={isLoading}
          disabled={!question.trim() || isLoading}
          icon={Send}
        >
          Ask
        </Button>
      </form>

      {/* Conversation / Query Findings Stream */}
      <div className="space-y-3 pt-2 max-h-96 overflow-y-auto pr-1">
        {history.map((item, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-[10px] bg-ivory/60 border border-gray space-y-2 text-xs animate-fade-in"
          >
            {/* Question Bar */}
            <div className="flex items-start justify-between gap-2 font-heading font-bold text-ink">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-forest shrink-0 mt-0.5" />
                <span>{item.question}</span>
              </span>
              <span className="text-[10px] text-ink/40 font-mono shrink-0">{item.timestamp}</span>
            </div>

            {/* Answer Box */}
            <div className="p-3 rounded-[8px] bg-white border border-gray/80 space-y-1.5">
              <p className="text-ink/90 leading-relaxed font-sans text-[11.5px]">{item.answer}</p>

              {/* Cited Evidence Pills */}
              {item.cited_evidence && item.cited_evidence.length > 0 && (
                <div className="pt-2 border-t border-gray/50 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-heading font-semibold text-ink/50 uppercase tracking-wider flex items-center gap-1">
                    <Bookmark className="w-3 h-3 text-forest" />
                    Cited Evidence:
                  </span>
                  {item.cited_evidence.map((ev, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-sage text-forest font-mono border border-forest/20"
                    >
                      {ev}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
