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
   * 2. Calculates canonical report hash and submission hash.
   * 3. Records progress via oracle wallet on chain (without impersonating freelancer).
   * 4. Persists ProgressReport and updates milestone state.
   */
  static async submitMilestone(
    milestoneIdOrAgreementId: string,
    freelancerId: string,
    data: z.infer<typeof submitMilestoneSchema>,
    milestoneIndex?: number
  ) {
    let milestone = await prisma.milestone.findUnique({
      where: { id: milestoneIdOrAgreementId },
      include: { agreement: true },
    });

    if (!milestone && milestoneIndex !== undefined) {
      milestone = await prisma.milestone.findFirst({
        where: {
          milestoneIndex: Number(milestoneIndex),
          OR: [
            { agreementId: milestoneIdOrAgreementId },
            { agreement: { onChainAgreementId: milestoneIdOrAgreementId } },
          ],
        },
        include: { agreement: true },
      });
    }

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    if (milestone.agreement.freelancerId !== freelancerId) {
      throw new Error('Unauthorized: only the assigned freelancer can submit this milestone');
    }

    if (milestone.status === 'APPROVED') {
      throw new Error('Milestone has already been approved');
    }

    // Determine target repository URL from input or agreement terms
    let repoUrl = data.repoUrl;
    let acceptanceCriteria: string[] = [];
    if (!repoUrl) {
      try {
        const terms = JSON.parse(milestone.agreement.termsJson);
        repoUrl = terms?.github?.repoUrl;
        const currentM = (terms?.milestones || []).find((m: any) => (m.index ?? m.milestoneIndex) === milestone!.milestoneIndex);
        if (currentM?.acceptanceCriteria) {
          acceptanceCriteria = currentM.acceptanceCriteria;
        }
      } catch {}
    }
    if (!repoUrl) {
      repoUrl = 'https://github.com/org/repo';
    }

    // 1. Analyze deliverable through AI service (code or multimodal)
    const isMultimodal =
      (data.deliverableType && data.deliverableType !== 'CODE') ||
      !!data.deliverableContent ||
      (data.assetUrl && !data.assetUrl.includes('github.com'));

    let aiAnalysis: any;
    if (isMultimodal) {
      const deliverableType = data.deliverableType || 'DESIGN';
      const deliverableContent = data.deliverableContent || data.assetUrl || data.notes || repoUrl;
      const multimodalRes = await AiAdapter.verifyMultimodalDeliverable({
        deliverableType,
        deliverableContent,
        milestoneTitle: milestone.title,
        milestoneDescription: milestone.description,
        acceptanceCriteria,
      });

      aiAnalysis = {
        testsPassing: multimodalRes.tests_passing,
        qualityScore: multimodalRes.quality_score,
        progressBps: multimodalRes.overall_progress_bps,
        summary: multimodalRes.summary,
        verifiedFiles: multimodalRes.criteria_verdicts.map(
          (v) => `[${v.verdict}] ${v.criterion}`
        ),
        recommendations: multimodalRes.criteria_verdicts.map(
          (v) => `${v.criterion}: ${v.evidence}`
        ),
        criteriaVerdicts: multimodalRes.criteria_verdicts,
      };
    } else {
      aiAnalysis = await AiAdapter.analyzeMilestone({
        repoUrl,
        commitSha: data.commitSha,
        milestoneTitle: milestone.title,
        milestoneDescription: milestone.description,
        acceptanceCriteria,
      });
    }

    // 2. Compute canonical report hash and submission hash
    const canonicalReportHash = computeCanonicalHash({
      repoUrl,
      commitSha: data.commitSha || 'HEAD',
      milestoneIndex: milestone.milestoneIndex,
      testsPassing: aiAnalysis.testsPassing,
      qualityScore: aiAnalysis.qualityScore,
      summary: aiAnalysis.summary,
    });

    const submissionHash = computeCanonicalHash({
      repoUrl,
      commitSha: data.commitSha || 'HEAD',
      notes: data.notes || '',
      prUrl: data.prUrl || '',
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
        repoUrl: data.assetUrl || repoUrl,
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
      where: { id: milestone.id },
      data: {
        status: 'SUBMITTED',
        submissionRepoUrl: data.assetUrl || repoUrl,
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
      submissionHash,
      canonicalReportHash,
      criteriaVerdicts: aiAnalysis.criteriaVerdicts || [],
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

  static async getById(id: string, milestoneIndex?: number) {
    if (!id || id === 'undefined' || id === 'null') {
      const err: any = new Error('Milestone ID is required');
      err.statusCode = 400;
      throw err;
    }

    let milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        progressReports: { orderBy: { createdAt: 'desc' } },
        agreement: {
          select: {
            id: true,
            title: true,
            status: true,
            clientId: true,
            freelancerId: true,
            onChainAgreementId: true,
          },
        },
      },
    });

    if (!milestone && milestoneIndex !== undefined) {
      milestone = await prisma.milestone.findFirst({
        where: {
          milestoneIndex: Number(milestoneIndex),
          OR: [
            { agreementId: id },
            { agreement: { onChainAgreementId: id } },
          ],
        },
        include: {
          progressReports: { orderBy: { createdAt: 'desc' } },
          agreement: {
            select: {
              id: true,
              title: true,
              status: true,
              clientId: true,
              freelancerId: true,
              onChainAgreementId: true,
            },
          },
        },
      });
    }

    if (!milestone) {
      const err: any = new Error('Milestone not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return milestone;
  }
}
