import { prisma } from '../../lib/prisma';
import { AiAdapter, AgreementTerms } from '../../adapters/aiAdapter';
import { ChainAdapter } from '../../adapters/chainAdapter';
import { computeCanonicalHash } from '../../utils/canonicalHash';
import { agreementTermsSchema, editAgreementSchema } from './agreement.schema';
import { z } from 'zod';

export class AgreementService {
  /**
   * Drafts an agreement using AI based on context from thread and post.
   */
  static async draftAgreement(
    creatorId: string,
    params: {
      threadId?: string;
      postId?: string;
      freelancerId: string;
      title?: string;
    }
  ) {
    let postContext: any = null;
    let threadContext: any = null;

    if (params.postId) {
      const post = await prisma.post.findUnique({ where: { id: params.postId } });
      if (post) {
        postContext = {
          title: post.title,
          description: post.description,
          budget: post.budget,
          tags: post.tags,
        };
      }
    }

    if (params.threadId) {
      const messages = await prisma.message.findMany({
        where: { threadId: params.threadId },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });
      threadContext = messages.map((m) => ({
        senderId: m.senderId,
        content: m.content,
      }));
    }

    const clientId = creatorId;
    const freelancerId = params.freelancerId;

    // Call AI service adapter
    const rawTerms = await AiAdapter.draftAgreement({
      title: params.title || postContext?.title || 'FairWork Escrow Agreement',
      postContext,
      threadContext,
      clientId,
      freelancerId,
    });

    // Validate terms against schema
    const terms = agreementTermsSchema.parse(rawTerms);

    // Save draft agreement
    const agreement = await prisma.agreement.create({
      data: {
        threadId: params.threadId,
        clientId,
        freelancerId,
        title: terms.title,
        termsJson: JSON.stringify(terms),
        status: 'DRAFT',
        milestones: {
          create: terms.milestones.map((m) => {
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + (m.deadlineDays || 7));
            return {
              milestoneIndex: m.milestoneIndex,
              title: m.title,
              description: m.description,
              amount: m.amount,
              deadline,
              status: 'PENDING',
            };
          }),
        },
      },
      include: {
        milestones: true,
        client: { select: { id: true, walletAddress: true, name: true } },
        freelancer: { select: { id: true, walletAddress: true, name: true } },
      },
    });

    return agreement;
  }

  static async getById(id: string) {
    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: {
        milestones: {
          include: {
            progressReports: { orderBy: { createdAt: 'desc' } },
          },
          orderBy: { milestoneIndex: 'asc' },
        },
        client: { select: { id: true, walletAddress: true, name: true } },
        freelancer: { select: { id: true, walletAddress: true, name: true } },
        disputes: {
          include: { evidences: true },
          orderBy: { createdAt: 'desc' },
        },
        chainEvents: { orderBy: { timestamp: 'asc' } },
        alerts: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }
    return agreement;
  }

  static async listUserAgreements(userId: string) {
    return prisma.agreement.findMany({
      where: {
        OR: [{ clientId: userId }, { freelancerId: userId }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        client: { select: { id: true, walletAddress: true, name: true } },
        freelancer: { select: { id: true, walletAddress: true, name: true } },
        milestones: { select: { id: true, milestoneIndex: true, title: true, amount: true, status: true } },
      },
    });
  }

  /**
   * Edits an agreement draft.
   * CRITICAL RULE: Agreement edits must reset approvals. Terms must become immutable after both parties approve.
   */
  static async editAgreement(
    agreementId: string,
    userId: string,
    data: z.infer<typeof editAgreementSchema>
  ) {
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      include: { milestones: true },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (agreement.clientId !== userId && agreement.freelancerId !== userId) {
      throw new Error('Unauthorized: only the client or freelancer can edit this agreement');
    }

    if (
      agreement.status === 'LOCKED' ||
      agreement.status === 'ONCHAIN_LINKED' ||
      agreement.status === 'COMPLETED'
    ) {
      throw new Error(
        `Agreement terms are immutable and cannot be modified once both parties have approved (current status: ${agreement.status}).`
      );
    }

    const validatedTerms = agreementTermsSchema.parse(data.terms);

    // Delete existing milestones and recreate according to new terms
    await prisma.milestone.deleteMany({ where: { agreementId } });

    // Reset approvals and status back to DRAFT
    const updated = await prisma.agreement.update({
      where: { id: agreementId },
      data: {
        title: data.title || validatedTerms.title,
        termsJson: JSON.stringify(validatedTerms),
        status: 'DRAFT',
        clientApprovedAt: null,
        freelancerApprovedAt: null,
        lockedAt: null,
        canonicalHash: null,
        milestones: {
          create: validatedTerms.milestones.map((m) => {
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + (m.deadlineDays || 7));
            return {
              milestoneIndex: m.milestoneIndex,
              title: m.title,
              description: m.description,
              amount: m.amount,
              deadline,
              status: 'PENDING',
            };
          }),
        },
      },
      include: {
        milestones: true,
        client: { select: { id: true, walletAddress: true, name: true } },
        freelancer: { select: { id: true, walletAddress: true, name: true } },
      },
    });

    return updated;
  }

  /**
   * Approves an agreement.
   * Once both client and freelancer approve, calculates deterministic canonical terms hash and locks terms.
   */
  static async approveAgreement(agreementId: string, userId: string) {
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    const isClient = agreement.clientId === userId;
    const isFreelancer = agreement.freelancerId === userId;

    if (!isClient && !isFreelancer) {
      throw new Error('Unauthorized: only agreement participants can approve');
    }

    let clientApprovedAt = agreement.clientApprovedAt;
    let freelancerApprovedAt = agreement.freelancerApprovedAt;

    if (isClient) {
      clientApprovedAt = new Date();
    }
    if (isFreelancer) {
      freelancerApprovedAt = new Date();
    }

    const bothApproved = clientApprovedAt !== null && freelancerApprovedAt !== null;

    let newStatus = agreement.status;
    let canonicalHash = agreement.canonicalHash;
    let lockedAt = agreement.lockedAt;

    if (bothApproved) {
      newStatus = 'LOCKED';
      lockedAt = new Date();

      // Deterministic canonical hash calculation
      const parsedTerms = JSON.parse(agreement.termsJson);
      canonicalHash = computeCanonicalHash(parsedTerms);
    } else if (isClient) {
      newStatus = 'CLIENT_APPROVED';
    } else if (isFreelancer) {
      newStatus = 'FREELANCER_APPROVED';
    }

    return prisma.agreement.update({
      where: { id: agreementId },
      data: {
        clientApprovedAt,
        freelancerApprovedAt,
        status: newStatus,
        lockedAt,
        canonicalHash,
      },
      include: {
        milestones: true,
        client: { select: { id: true, walletAddress: true, name: true } },
        freelancer: { select: { id: true, walletAddress: true, name: true } },
      },
    });
  }

  /**
   * Links local locked agreement with verified on-chain contract.
   * CRITICAL RULE: verify on-chain terms hashes before linking an agreement.
   */
  static async linkOnChain(
    agreementId: string,
    userId: string,
    params: { onChainAgreementId: string; transactionHash?: string }
  ) {
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (agreement.clientId !== userId && agreement.freelancerId !== userId) {
      throw new Error('Unauthorized to link agreement');
    }

    if (agreement.status !== 'LOCKED' && agreement.status !== 'ONCHAIN_LINKED') {
      throw new Error(
        'Agreement must be in LOCKED status with mutual approvals before linking on-chain'
      );
    }

    if (!agreement.canonicalHash) {
      throw new Error('Missing canonical terms hash on agreement');
    }

    // Verify on-chain terms hash
    const { valid, onChainTermsHash } = await ChainAdapter.verifyTermsHash(
      params.onChainAgreementId,
      agreement.canonicalHash
    );

    if (!valid) {
      throw new Error(
        `On-chain terms hash mismatch! On-chain: ${onChainTermsHash}, Local canonicalHash: ${agreement.canonicalHash}`
      );
    }

    // Update agreement with on-chain link
    return prisma.agreement.update({
      where: { id: agreementId },
      data: {
        onChainAgreementId: params.onChainAgreementId,
        onChainTxHash: params.transactionHash || `0xmock_link_tx_${Date.now()}`,
        status: 'ONCHAIN_LINKED',
      },
      include: {
        milestones: true,
      },
    });
  }
}
