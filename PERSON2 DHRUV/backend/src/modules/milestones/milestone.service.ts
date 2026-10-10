import { prisma } from '../../lib/prisma';
import { AiAdapter } from '../../adapters/aiAdapter';
import { ChainAdapter } from '../../adapters/chainAdapter';
import { computeCanonicalHash } from '../../utils/canonicalHash';
import { z } from 'zod';
import { submitMilestoneSchema, reviewMilestoneSchema } from './milestone.schema';

export class MilestoneService {
  /**
   * Submits a milestone:
   * 1. Analyzes the repository via AI.
   * 2. Calculates canonical report hash.
   * 3. Records progress via oracle wallet on chain (without impersonating freelancer).
   * 4. Persists ProgressReport and updates milestone state.
   */
  static async submitMilestone(
    milestoneId: string,
    freelancerId: string,
    data: z.infer<typeof submitMilestoneSchema>
  ) {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { agreement: true },
    });

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    if (milestone.agreement.freelancerId !== freelancerId) {
      throw new Error('Unauthorized: only the assigned freelancer can submit this milestone');
    }

    if (milestone.status === 'APPROVED') {
      throw new Error('Milestone has already been approved');
    }

    // 1. Analyze repo through AI service
    const aiAnalysis = await AiAdapter.analyzeMilestone({
      repoUrl: data.repoUrl,
      commitSha: data.commitSha,
      milestoneTitle: milestone.title,
      milestoneDescription: milestone.description,
    });

    // 2. Compute canonical report hash
    const canonicalReportHash = computeCanonicalHash({
      repoUrl: data.repoUrl,
      commitSha: data.commitSha || 'HEAD',
      milestoneIndex: milestone.milestoneIndex,
      testsPassing: aiAnalysis.testsPassing,
      qualityScore: aiAnalysis.qualityScore,
      summary: aiAnalysis.summary,
    });

    // 3. Record progress on-chain via ORACLE wallet (never impersonating freelancer wallet)
    const onChainAgreementId =
      milestone.agreement.onChainAgreementId || milestone.agreement.id;

    const oracleTx = await ChainAdapter.recordProgressThroughOracle({
      agreementId: onChainAgreementId,
      milestoneIndex: milestone.milestoneIndex,
      canonicalReportHash,
      qualityScore: aiAnalysis.qualityScore,
    });

    // 4. Save ProgressReport in DB
    const report = await prisma.progressReport.create({
      data: {
        milestoneId: milestone.id,
        repoUrl: data.repoUrl,
        commitSha: data.commitSha,
        aiSummary: aiAnalysis.summary,
        testsPassing: aiAnalysis.testsPassing,
        qualityScore: aiAnalysis.qualityScore,
        canonicalReportHash,
        oracleTxHash: oracleTx.transactionHash,
      },
    });

    // 5. Update milestone status
    const updatedMilestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: 'SUBMITTED',
        submissionRepoUrl: data.repoUrl,
        submissionCommitSha: data.commitSha,
        submissionNotes: data.notes,
        submittedAt: new Date(),
      },
      include: {
        progressReports: { orderBy: { createdAt: 'desc' } },
        agreement: true,
      },
    });

    return {
      milestone: updatedMilestone,
      latestReport: report,
      oracleTxHash: oracleTx.transactionHash,
    };
  }

  static async reviewMilestone(
    milestoneId: string,
    clientId: string,
    data: z.infer<typeof reviewMilestoneSchema>
  ) {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { agreement: true },
    });

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    if (milestone.agreement.clientId !== clientId) {
      throw new Error('Unauthorized: only the client can review this milestone');
    }

    const newStatus = data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    return prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: newStatus,
      },
      include: {
        progressReports: true,
      },
    });
  }

  static async getById(id: string) {
    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        progressReports: { orderBy: { createdAt: 'desc' } },
        agreement: {
          include: {
            client: { select: { id: true, walletAddress: true, name: true } },
            freelancer: { select: { id: true, walletAddress: true, name: true } },
          },
        },
        alerts: true,
      },
    });

    if (!milestone) {
      throw new Error('Milestone not found');
    }
    return milestone;
  }
}
