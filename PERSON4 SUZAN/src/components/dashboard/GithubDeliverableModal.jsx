import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import { GitCommit, GitPullRequest, CheckCircle2, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';

export default function GithubDeliverableModal({ isOpen, onClose, onSelectCommit, repoUrl = 'https://github.com/org/repo' }) {
  const toast = useToast();
  const [isSimulating, setIsSimulating] = useState(false);

  const sampleCommits = [
    {
      sha: '84df6a71dde9b671a1989f50cfb75301cfbd6ab5',
      message: 'feat(milestone): complete core smart contract escrow integration & test suites',
      author: 'bob-builder',
      date: '10 minutes ago',
      filesChanged: 14,
      score: 92
    },
    {
      sha: '1fb3da400f92aa506117bc3782bc22c8230d7909',
      message: 'refactor(ui): responsive fintech styling with Ivory and Sage design tokens',
      author: 'suzan-dev',
      date: '1 hour ago',
      filesChanged: 8,
      score: 88
    },
    {
      sha: 'a47b192ec34004871170f8138c2c25237190f518',
      message: 'test: add vitest canonicalHash and termsToChain unit test suites',
      author: 'bob-builder',
      date: '3 hours ago',
      filesChanged: 3,
      score: 95
    }
  ];

  const handleSimulateWebhook = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      const chosen = sampleCommits[0];
      if (onSelectCommit) {
        onSelectCommit({
          commitSha: chosen.sha,
          prUrl: `${repoUrl}/pull/12`,
          aiScore: chosen.score
        });
      }
      toast.success(`GitHub webhook captured commit ${chosen.sha.slice(0, 7)} with ${chosen.score}% score`);
      onClose();
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="GitHub Deliverable Explorer & Webhook"
      subtitle={`Select a verified commit from ${repoUrl.split('/').slice(-2).join('/') || 'repo'}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        {/* Webhook trigger button */}
        <div className="p-4 rounded-[10px] bg-sage/40 border border-forest/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="text-xs font-heading font-bold text-ink block">Simulate Live Webhook Push</span>
            <span className="text-[11px] text-ink/70">
              Auto-fetch latest commit SHA, PR diffs, and run advisory AI inspection.
            </span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSimulateWebhook}
            loading={isSimulating}
            icon={Sparkles}
            className="whitespace-nowrap"
          >
            Trigger Webhook
          </Button>
        </div>

        {/* Commit List */}
        <div className="space-y-2.5">
          <span className="text-xs font-heading font-semibold uppercase text-ink/60 tracking-wider">
            Recent Branch Commits
          </span>

          <div className="space-y-2">
            {sampleCommits.map((c) => (
              <div
                key={c.sha}
                onClick={() => {
                  if (onSelectCommit) {
                    onSelectCommit({
                      commitSha: c.sha,
                      prUrl: `${repoUrl}/pull/12`,
                      aiScore: c.score
                    });
                  }
                  toast.success(`Selected commit ${c.sha.slice(0, 7)}`);
                  onClose();
                }}
                className="p-3 bg-white border border-gray rounded-[10px] hover:border-forest hover:bg-sage/20 transition-all cursor-pointer group text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-forest shrink-0" />
                    <span className="font-mono text-xs font-bold text-ink group-hover:text-forest">
                      {c.sha.slice(0, 7)}
                    </span>
                    <Badge status="success">AI Score: {c.score}%</Badge>
                  </div>
                  <span className="text-[10px] text-ink/50">{c.date}</span>
                </div>

                <p className="text-xs text-ink/80 mt-1.5 leading-snug line-clamp-2">
                  {c.message}
                </p>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray/50 text-[10px] text-ink/60">
                  <span>Author: {c.author} · {c.filesChanged} files</span>
                  <span className="font-heading font-semibold text-forest group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Use This Deliverable <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
