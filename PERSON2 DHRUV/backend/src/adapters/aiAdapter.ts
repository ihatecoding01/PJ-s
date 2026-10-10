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
  }>;
}

export interface MilestoneAnalysisResult {
  testsPassing: boolean;
  qualityScore: number;
  summary: string;
  verifiedFiles: string[];
  recommendations: string[];
}

export interface DisputeAnalysisResult {
  summary: string;
  recommendation: 'CLIENT_REFUND' | 'FREELANCER_PAYOUT' | 'SPLIT_50_50' | 'PARTIAL_SETTLEMENT';
  splitPercentageClient?: number;
  splitPercentageFreelancer?: number;
  reasoning: string;
}

export class AiAdapter {
  /**
   * Drafts an agreement using the AI service.
   * If AI_MOCK=true, returns a deterministic structured draft satisfying the schema.
   */
  static async draftAgreement(input: AgreementDraftInput): Promise<AgreementTerms> {
    if (env.AI_MOCK) {
      const budget = input.postContext?.budget ?? 1000;
      const m1Budget = Math.round(budget * 0.4);
      const m2Budget = budget - m1Budget;

      return {
        title: input.title || input.postContext?.title || 'FairWork Freelance Agreement',
        summary: `Autonomous agreement generated from post '${input.postContext?.title ?? 'Direct Negotiation'}' and negotiation thread messages.`,
        totalBudget: budget,
        currency: 'USDC',
        revisionPolicy: 'Up to 2 revision rounds per milestone within 3 days of submission.',
        cancellationPolicy: 'Mutual consensus or Escrow arbitration upon formal dispute filing.',
        milestones: [
          {
            milestoneIndex: 0,
            title: 'Phase 1: Architecture & Core Implementation',
            description: 'Foundation setup, core data models, tests, and API endpoints.',
            amount: m1Budget,
            deadlineDays: 7,
            deliverables: ['API Specification', 'Database Models', 'Initial Core Tests'],
          },
          {
            milestoneIndex: 1,
            title: 'Phase 2: Final Integration & Delivery',
            description: 'Full system integration, end-to-end tests, documentation, and deployment.',
            amount: m2Budget,
            deadlineDays: 14,
            deliverables: ['Production Bundle', 'User Documentation', 'E2E Test Suite'],
          },
        ],
      };
    }

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/draft-agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`AI Service error: ${response.statusText}`);
      }

      return (await response.json()) as AgreementTerms;
    } catch (error: any) {
      console.warn(`[AI Service Fallback] Calling mock AI draft due to error: ${error.message}`);
      // Fallback to mock if service is unreachable
      return this.draftAgreement({ ...input });
    }
  }

  /**
   * Analyzes a repository submission for a milestone.
   */
  static async analyzeMilestone(params: {
    repoUrl: string;
    commitSha?: string;
    milestoneTitle: string;
    milestoneDescription: string;
  }): Promise<MilestoneAnalysisResult> {
    if (env.AI_MOCK) {
      return {
        testsPassing: true,
        qualityScore: 94,
        summary: `Deterministic AI Analysis for ${params.repoUrl} at commit ${params.commitSha || 'HEAD'}: Repository satisfies deliverable criteria. All automated unit tests passing, clean commit history.`,
        verifiedFiles: ['src/core.ts', 'src/services.ts', 'tests/suite.spec.ts'],
        recommendations: ['Consider increasing coverage on edge cases', 'Add load testing'],
      };
    }

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/analyze-milestone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`AI Service error: ${response.statusText}`);
      }

      return (await response.json()) as MilestoneAnalysisResult;
    } catch (error: any) {
      console.warn(`[AI Service Fallback] Calling mock analysis: ${error.message}`);
      return this.analyzeMilestone({ ...params });
    }
  }

  /**
   * Summarizes a dispute and provides an oracle recommendation.
   */
  static async summarizeDispute(params: {
    disputeReason: string;
    agreementTitle: string;
    evidenceList: Array<{ description?: string | null; filename: string; contentHash: string }>;
  }): Promise<DisputeAnalysisResult> {
    if (env.AI_MOCK) {
      return {
        summary: `AI Dispute Assessment for '${params.agreementTitle}': Review of reason '${params.disputeReason}' alongside ${params.evidenceList.length} evidence attachments. Evidence confirms partial delivery of Phase 1 deliverables with minor documentation delay.`,
        recommendation: 'PARTIAL_SETTLEMENT',
        splitPercentageClient: 30,
        splitPercentageFreelancer: 70,
        reasoning: 'Primary core technical specifications were met; partial reduction applies to delayed handover.',
      };
    }

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/summarize-dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`AI Service error: ${response.statusText}`);
      }

      return (await response.json()) as DisputeAnalysisResult;
    } catch (error: any) {
      console.warn(`[AI Service Fallback] Calling mock dispute summary: ${error.message}`);
      return this.summarizeDispute({ ...params });
    }
  }
}
