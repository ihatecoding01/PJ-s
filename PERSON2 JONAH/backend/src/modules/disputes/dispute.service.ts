import fs from 'fs';
import { prisma } from '../../lib/prisma';
import { AiAdapter } from '../../adapters/aiAdapter';
import { computeSha256 } from '../../utils/canonicalHash';
import { z } from 'zod';
import { createDisputeSchema, resolveDisputeSchema } from './dispute.schema';

export class DisputeService {
  static async createDispute(userId: string, data: z.infer<typeof createDisputeSchema>) {
    const agreement = await prisma.agreement.findUnique({
      where: { id: data.agreementId },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (agreement.clientId !== userId && agreement.freelancerId !== userId) {
      throw new Error('Unauthorized: only agreement parties can raise a dispute');
    }

    const dispute = await prisma.dispute.create({
      data: {
        agreementId: data.agreementId,
        raisedById: userId,
        reason: data.reason,
        status: 'OPEN',
      },
    });

    // Update agreement status to DISPUTED
    await prisma.agreement.update({
      where: { id: data.agreementId },
      data: { status: 'DISPUTED' },
    });

    return dispute;
  }

  static async uploadEvidence(
    disputeId: string,
    userId: string,
    file: Express.Multer.File,
    description?: string
  ) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Read file buffer safely to compute SHA-256 content hash
    const fileBuffer = fs.readFileSync(file.path);
    const contentHash = computeSha256(fileBuffer);

    const evidence = await prisma.evidence.create({
      data: {
        disputeId: dispute.id,
        agreementId: dispute.agreementId,
        uploadedById: userId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: file.path,
        contentHash,
        description: description || null,
      },
      include: {
        uploadedBy: { select: { id: true, walletAddress: true, name: true } },
      },
    });

    return evidence;
  }

  static async generateAiSummaryAndRecommendation(disputeId: string) {
    if (!disputeId || disputeId === 'undefined' || disputeId === 'null') {
      const err: any = new Error('Dispute ID is required');
      err.statusCode = 400;
      throw err;
    }

    let dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        agreement: true,
        evidences: true,
      },
    });

    if (!dispute) {
      dispute = await prisma.dispute.findFirst({
        where: {
          OR: [
            { agreementId: disputeId },
            { agreement: { onChainAgreementId: disputeId } },
          ],
        },
        include: {
          agreement: true,
          evidences: true,
        },
      });
    }

    if (!dispute) {
      const err: any = new Error('Dispute not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const aiResult = await AiAdapter.summarizeDispute({
      disputeReason: dispute.reason,
      agreementTitle: dispute.agreement.title,
      evidenceList: dispute.evidences.map((e) => ({
        description: e.description,
        filename: e.originalName,
        contentHash: e.contentHash,
      })),
    });

    const recommendationStr = `${aiResult.recommendation} | Client: ${aiResult.splitPercentageClient ?? 0}% / Freelancer: ${aiResult.splitPercentageFreelancer ?? 0}%. Reasoning: ${aiResult.reasoning}`;

    const updated = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        aiSummary: aiResult.summary,
        oracleRecommendation: recommendationStr,
      },
      include: {
        evidences: true,
      },
    });

    return updated;
  }

  static async resolveDispute(
    disputeId: string,
    data: z.infer<typeof resolveDisputeSchema>
  ) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    const updated = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'RESOLVED',
        resolution: data.resolution,
      },
    });

    // Check if agreement should be marked as COMPLETED
    await prisma.agreement.update({
      where: { id: dispute.agreementId },
      data: { status: 'COMPLETED' },
    });

    return updated;
  }

  static async getById(id: string) {
    if (!id || id === 'undefined' || id === 'null') {
      const err: any = new Error('Dispute ID is required');
      err.statusCode = 400;
      throw err;
    }

    let dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        agreement: {
          include: {
            client: { select: { id: true, walletAddress: true, name: true } },
            freelancer: { select: { id: true, walletAddress: true, name: true } },
          },
        },
        evidences: {
          include: {
            uploadedBy: { select: { id: true, walletAddress: true, name: true } },
          },
        },
      },
    });

    if (!dispute) {
      dispute = await prisma.dispute.findFirst({
        where: {
          OR: [
            { agreementId: id },
            { agreement: { onChainAgreementId: id } },
          ],
        },
        include: {
          agreement: {
            include: {
              client: { select: { id: true, walletAddress: true, name: true } },
              freelancer: { select: { id: true, walletAddress: true, name: true } },
            },
          },
          evidences: {
            include: {
              uploadedBy: { select: { id: true, walletAddress: true, name: true } },
            },
          },
        },
      });
    }

    if (!dispute) {
      const err: any = new Error('Dispute not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return dispute;
  }

  static async getArbitratorDossier(disputeId: string) {
    if (!disputeId || disputeId === 'undefined' || disputeId === 'null') {
      const err: any = new Error('Dispute ID is required');
      err.statusCode = 400;
      throw err;
    }

    let dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        agreement: {
          include: {
            milestones: {
              include: {
                progressReports: { orderBy: { createdAt: 'desc' }, take: 1 },
              },
            },
            client: { select: { id: true, walletAddress: true, name: true } },
            freelancer: { select: { id: true, walletAddress: true, name: true } },
          },
        },
        evidences: {
          include: {
            uploadedBy: { select: { id: true, walletAddress: true, name: true } },
          },
        },
      },
    });

    if (!dispute) {
      dispute = await prisma.dispute.findFirst({
        where: {
          OR: [
            { agreementId: disputeId },
            { agreement: { onChainAgreementId: disputeId } },
          ],
        },
        include: {
          agreement: {
            include: {
              milestones: {
                include: {
                  progressReports: { orderBy: { createdAt: 'desc' }, take: 1 },
                },
              },
              client: { select: { id: true, walletAddress: true, name: true } },
              freelancer: { select: { id: true, walletAddress: true, name: true } },
            },
          },
          evidences: {
            include: {
              uploadedBy: { select: { id: true, walletAddress: true, name: true } },
            },
          },
        },
      });
    }

    if (!dispute) {
      const err: any = new Error('Dispute not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    let parsedTerms: any = {};
    try {
      parsedTerms = JSON.parse(dispute.agreement.termsJson);
    } catch {
      parsedTerms = { title: dispute.agreement.title };
    }

    const disputedMilestone =
      dispute.agreement.milestones.find((m) => m.status === 'DISPUTED' || m.status === 'REJECTED' || m.status === 'SUBMITTED') ||
      dispute.agreement.milestones[0];

    const submissionInfo = {
      commit_sha: disputedMilestone?.submissionCommitSha || undefined,
      pr_url: disputedMilestone?.submissionRepoUrl || undefined,
      notes: disputedMilestone?.submissionNotes || undefined,
    };

    const evidenceList = dispute.evidences.map(
      (e) => `[${e.originalName}] (${e.uploadedBy?.name || 'Party'}): ${e.description || 'Uploaded file'} (hash: ${e.contentHash.substring(0, 8)})`
    );

    const dossier = await AiAdapter.getArbitratorDossier({
      disputeId: dispute.id,
      terms: parsedTerms,
      milestone: disputedMilestone || { title: 'General Milestone' },
      submission: submissionInfo,
      rejectionReason: dispute.reason,
      evidence: evidenceList,
    });

    return dossier;
  }

  static async queryArbitratorDossier(disputeId: string, question: string) {
    if (!disputeId || disputeId === 'undefined' || disputeId === 'null') {
      const err: any = new Error('Dispute ID is required');
      err.statusCode = 400;
      throw err;
    }

    let dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        agreement: {
          include: {
            milestones: true,
          },
        },
        evidences: true,
      },
    });

    if (!dispute) {
      dispute = await prisma.dispute.findFirst({
        where: {
          OR: [
            { agreementId: disputeId },
            { agreement: { onChainAgreementId: disputeId } },
          ],
        },
        include: {
          agreement: {
            include: {
              milestones: true,
            },
          },
          evidences: true,
        },
      });
    }

    if (!dispute) {
      const err: any = new Error('Dispute not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    let parsedTerms: any = {};
    try {
      parsedTerms = JSON.parse(dispute.agreement.termsJson);
    } catch {}

    const context = {
      disputeReason: dispute.reason,
      agreementTitle: dispute.agreement.title,
      terms: parsedTerms,
      milestones: dispute.agreement.milestones.map((m) => ({
        index: m.milestoneIndex,
        title: m.title,
        status: m.status,
        submissionNotes: m.submissionNotes,
        submissionCommitSha: m.submissionCommitSha,
      })),
      evidenceCount: dispute.evidences.length,
      evidences: dispute.evidences.map((e) => ({
        name: e.originalName,
        desc: e.description,
        hash: e.contentHash,
      })),
    };

    const result = await AiAdapter.queryArbitratorDossier({
      disputeId,
      question,
      context,
    });

    return result;
  }
}
