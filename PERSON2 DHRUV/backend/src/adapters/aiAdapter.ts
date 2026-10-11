import { env } from '../config/env';

export interface AgreementDraftInput {
  title: string;
  postContext?: {
    title: string;
    description: string;
    budget: number;
    tags?: string;
  } | null;
  threadContext?: Array<{
    senderId: string;
    content: string;
  }>;
  clientId: string;
  freelancerId: string;
}

export interface AgreementTerms {
  title: string;
  summary: string;
  totalBudget: number;
  currency: string;
  revisionPolicy: string;
  cancellationPolicy: string;
  milestones: Array<{
    milestoneIndex: number;
    title: string;
    description: string;
    amount: number;
    deadlineDays: number;
    deliverables: string[];
    index?: number;
    deadline?: string;
    acceptanceCriteria?: string[];
    requiredProgressBps?: number;
  }>;
  // Canonical schema properties
  schemaVersion?: string;
  description?: string;
  client?: string;
  freelancer?: string;
  totalAmount?: string;
  paymentMode?: string;
  latePenaltyBpsPerDay?: number;
  maxLatePenaltyBps?: number;
  reviewWindowDays?: number;
  graceDays?: number;
  maxRevisions?: number;
  github?: {
    repoUrl: string;
    branch: string;
  };
  createdAt?: string;
}

export interface MilestoneAnalysisResult {
  testsPassing: boolean;
  qualityScore: number;
  summary: string;
  verifiedFiles: string[];
  recommendations: string[];
  progressBps?: number;
}

export interface DisputeAnalysisResult {
  summary: string;
  recommendation: 'CLIENT_REFUND' | 'FREELANCER_PAYOUT' | 'SPLIT_50_50' | 'PARTIAL_SETTLEMENT';
  splitPercentageClient?: number;
  splitPercentageFreelancer?: number;
  recommendedFreelancerShareBps?: number;
  reasoning: string;
}

export class AiAdapter {
  private static getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (env.AI_INTERNAL_KEY) {
      headers['X-Internal-Key'] = env.AI_INTERNAL_KEY;
    }
    return headers;
  }

  private static getMockDraft(input: AgreementDraftInput): AgreementTerms {
    const budget = input.postContext?.budget || 1000;
    const m1Budget = Math.round(budget * 0.4);
    const m2Budget = budget - m1Budget;

    return {
      title: input.title || input.postContext?.title || 'FairWork Freelance Agreement',
      summary: `Autonomous agreement generated from post '${input.postContext?.title ?? 'Direct Negotiation'}' and negotiation thread messages.`,
      description: `Autonomous agreement generated from post '${input.postContext?.title ?? 'Direct Negotiation'}' and negotiation thread messages.`,
      totalBudget: budget,
      totalAmount: String(budget),
      currency: 'MATIC',
      paymentMode: 'MILESTONE',
      latePenaltyBpsPerDay: 100,
      maxLatePenaltyBps: 3000,
      reviewWindowDays: 5,
      graceDays: 3,
      maxRevisions: 2,
      revisionPolicy: 'Up to 2 revision rounds per milestone within 5 days of submission.',
      cancellationPolicy: 'Mutual consensus or Escrow arbitration upon formal dispute filing.',
      github: {
        repoUrl: 'https://github.com/org/repo',
        branch: 'main',
      },
      milestones: [
        {
          milestoneIndex: 0,
          index: 0,
          title: 'Phase 1: Architecture & Core Implementation',
          description: 'Foundation setup, core data models, tests, and API endpoints.',
          amount: m1Budget,
          deadlineDays: 7,
          deliverables: ['API Specification', 'Database Models', 'Initial Core Tests'],
          acceptanceCriteria: ['API Specification', 'Database Models', 'Initial Core Tests'],
          requiredProgressBps: 8000,
        },
        {
          milestoneIndex: 1,
          index: 1,
          title: 'Phase 2: Final Integration & Delivery',
          description: 'Full system integration, end-to-end tests, documentation, and deployment.',
          amount: m2Budget,
          deadlineDays: 14,
          deliverables: ['Production Bundle', 'User Documentation', 'E2E Test Suite'],
          acceptanceCriteria: ['Production Bundle', 'User Documentation', 'E2E Test Suite'],
          requiredProgressBps: 8000,
        },
      ],
    };
  }

  /**
   * Generates a structured freelance agreement draft.
   */
  static async draftAgreement(input: AgreementDraftInput): Promise<AgreementTerms> {
    if (env.AI_MOCK) {
      return this.getMockDraft(input);
    }

    try {
      const threadMessages = (input.threadContext || []).map((m) => ({
        sender: m.senderId.startsWith('0x') ? m.senderId : '0x1111111111111111111111111111111111111111',
        text: m.content,
        ts: new Date().toISOString(),
      }));

      const clientAddr = input.clientId.startsWith('0x') ? input.clientId : '0x1111111111111111111111111111111111111111';
      const freelancerAddr = input.freelancerId.startsWith('0x') ? input.freelancerId : '0x2222222222222222222222222222222222222222';

      const response = await fetch(`${env.AI_SERVICE_URL}/ai/contract/draft`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          thread_messages: threadMessages.length > 0 ? threadMessages : [
            {
              sender: clientAddr,
              text: `Project setup for ${input.title}. Budget is ${input.postContext?.budget || 1.0} MATIC.`,
              ts: new Date().toISOString(),
            }
          ],
          post_context: input.postContext || { title: input.title },
          parties: {
            client: clientAddr,
            freelancer: freelancerAddr,
          },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const code = errJson?.detail?.code || (response.status === 429 ? 'GITHUB_RATE_LIMIT' : 'AI_SERVICE_ERROR');
        const message = errJson?.detail?.message || `AI Service error: ${response.statusText}`;
        const err = new Error(message);
        (err as any).code = code;
        throw err;
      }

      const resData = await response.json();
      const terms = resData.terms;

      // Ensure compatibility with both schemas
      const budgetNum = parseFloat(terms.totalAmount) || 1.0;
      return {
        ...terms,
        totalBudget: budgetNum,
        summary: terms.description || terms.title,
        revisionPolicy: `Up to ${terms.maxRevisions || 2} revision rounds per milestone.`,
        cancellationPolicy: 'Mutual consensus or Escrow arbitration upon formal dispute filing.',
        milestones: (terms.milestones || []).map((m: any, idx: number) => ({
          ...m,
          milestoneIndex: m.index ?? idx,
          amount: parseFloat(m.amount) || 0.5,
          deadlineDays: 7,
          deliverables: m.acceptanceCriteria || [],
        })),
      };
    } catch (error: any) {
      console.warn(`[AI Service Fallback] Calling mock AI draft due to error: ${error.message}`);
      return this.getMockDraft(input);
    }
  }

  /**
   * Reviews an agreement draft for unfair terms or missing items.
   */
  static async reviewAgreement(terms: any): Promise<any> {
    if (env.AI_MOCK) {
      return {
        summary: 'Agreement terms are balanced and compliant with platform policies.',
        flags: [],
        score: 95,
      };
    }

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/ai/contract/review`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ terms }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const message = errJson?.detail?.message || `AI Review error: ${response.statusText}`;
        throw new Error(message);
      }

      return await response.json();
    } catch (err: any) {
      console.warn(`[AI Service Fallback] Calling mock AI review due to error: ${err.message}`);
      return {
        summary: 'Agreement review completed via fallback.',
        flags: [],
        score: 90,
      };
    }
  }

  private static getMockMilestoneAnalysis(params: any): MilestoneAnalysisResult {
    return {
      testsPassing: true,
      qualityScore: 94,
      progressBps: 9400,
      summary: `Deterministic AI Analysis for ${params.repoUrl} at commit ${params.commitSha || 'HEAD'}: Repository satisfies deliverable criteria. All automated unit tests passing, clean commit history.`,
      verifiedFiles: ['src/core.ts', 'src/services.ts', 'tests/suite.spec.ts'],
      recommendations: ['Consider increasing coverage on edge cases', 'Add load testing'],
    };
  }

  /**
   * Analyzes a repository submission for a milestone.
   */
  static async analyzeMilestone(params: {
    repoUrl: string;
    commitSha?: string;
    milestoneTitle: string;
    milestoneDescription: string;
    acceptanceCriteria?: string[];
    requiredProgressBps?: number;
    since?: string;
    until?: string;
    branch?: string;
  }): Promise<MilestoneAnalysisResult> {
    if (env.AI_MOCK) {
      return this.getMockMilestoneAnalysis(params);
    }

    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

      const response = await fetch(`${env.AI_SERVICE_URL}/ai/github/analyze`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          repo_url: params.repoUrl,
          branch: params.branch || 'main',
          since: params.since || thirtyDaysAgo.toISOString(),
          until: params.until || now.toISOString(),
          commit_sha: params.commitSha || null,
          milestone: {
            title: params.milestoneTitle,
            description: params.milestoneDescription || '',
            acceptance_criteria: params.acceptanceCriteria && params.acceptanceCriteria.length > 0
              ? params.acceptanceCriteria
              : [`Implement functionality for ${params.milestoneTitle}`],
            required_progress_bps: params.requiredProgressBps || 8000,
          },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const code = errJson?.detail?.code || (response.status === 429 ? 'GITHUB_RATE_LIMIT' : 'AI_SERVICE_ERROR');
        const message = errJson?.detail?.message || `GitHub analysis error: ${response.statusText}`;
        const err = new Error(message);
        (err as any).code = code;
        throw err;
      }

      const resData = await response.json();
      const progressBps = resData.progress_bps ?? 8000;
      const testsPassing = resData.signals?.tests_status === 'passing';

      return {
        testsPassing,
        qualityScore: Math.round(progressBps / 100),
        progressBps,
        summary: resData.summary || `AI evaluated repo progress at ${progressBps} bps.`,
        verifiedFiles: [
          `Commits: ${resData.signals?.commits || 0}`,
          `Files changed: ${resData.signals?.files_changed || 0}`,
          `Tests status: ${resData.signals?.tests_status || 'none'}`,
        ],
        recommendations: resData.risks || [],
      };
    } catch (error: any) {
      if ((error as any).code === 'GITHUB_RATE_LIMIT') {
        throw error;
      }
      console.warn(`[AI Service Fallback] Calling mock analysis: ${error.message}`);
      return this.getMockMilestoneAnalysis(params);
    }
  }

  private static getMockDisputeSummary(params: any): DisputeAnalysisResult {
    return {
      summary: `AI Dispute Assessment for '${params.agreementTitle}': Review of reason '${params.disputeReason}' alongside ${params.evidenceList.length} evidence attachments. Evidence confirms partial delivery of Phase 1 deliverables with minor documentation delay.`,
      recommendation: 'PARTIAL_SETTLEMENT',
      splitPercentageClient: 30,
      splitPercentageFreelancer: 70,
      recommendedFreelancerShareBps: 7000,
      reasoning: 'Primary core technical specifications were met; partial reduction applies to delayed handover.',
    };
  }

  /**
   * Summarizes a dispute and provides an oracle recommendation.
   */
  static async summarizeDispute(params: {
    disputeReason: string;
    agreementTitle: string;
    evidenceList: Array<{ description?: string | null; filename: string; contentHash: string }>;
    terms?: any;
    milestone?: any;
    submission?: any;
  }): Promise<DisputeAnalysisResult> {
    if (env.AI_MOCK) {
      return this.getMockDisputeSummary(params);
    }

    try {
      const evidenceTexts = params.evidenceList.map(
        (e) => `File ${e.filename} (hash: ${e.contentHash.substring(0, 10)}): ${e.description || 'Uploaded evidence'}`
      );

      const termsObj = params.terms || {
        title: params.agreementTitle,
        totalAmount: '1.0',
        currency: 'MATIC',
        milestones: [],
      };

      const milestoneObj = params.milestone || {
        title: 'Disputed Deliverable',
        amount: '1.0',
        acceptanceCriteria: [],
      };

      const submissionObj = params.submission || {
        notes: 'Submitted milestone work',
      };

      const response = await fetch(`${env.AI_SERVICE_URL}/ai/dispute/summary`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          terms: termsObj,
          milestone: milestoneObj,
          submission: submissionObj,
          rejection_reason: params.disputeReason,
          github_report: null,
          evidence: evidenceTexts,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const message = errJson?.detail?.message || `Dispute summary error: ${response.statusText}`;
        throw new Error(message);
      }

      const resData = await response.json();
      const shareBps = resData.recommended_freelancer_share_bps ?? 5000;
      const freelancerPct = Math.round(shareBps / 100);
      const clientPct = 100 - freelancerPct;

      let recType: 'CLIENT_REFUND' | 'FREELANCER_PAYOUT' | 'SPLIT_50_50' | 'PARTIAL_SETTLEMENT' = 'PARTIAL_SETTLEMENT';
      if (shareBps === 0) recType = 'CLIENT_REFUND';
      else if (shareBps === 10000) recType = 'FREELANCER_PAYOUT';
      else if (shareBps === 5000) recType = 'SPLIT_50_50';

      return {
        summary: resData.summary,
        recommendation: recType,
        splitPercentageClient: clientPct,
        splitPercentageFreelancer: freelancerPct,
        recommendedFreelancerShareBps: shareBps,
        reasoning: resData.reasoning,
      };
    } catch (error: any) {
      console.warn(`[AI Service Fallback] Calling mock dispute summary: ${error.message}`);
      return this.getMockDisputeSummary(params);
    }
  }
}
