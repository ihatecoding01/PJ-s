import { ethers } from 'ethers';
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
      threadContext = (messages as any[]).map((m: any) => ({
        senderId: String(m.senderId),
        content: String(m.content),
      }));
    }

    const clientId = creatorId;
    let freelancerId = params.freelancerId;

    if (freelancerId) {
      const existingUser = await prisma.user.findUnique({ where: { id: freelancerId } });
      if (!existingUser) {
        let addrFormatted = freelancerId;
        if (freelancerId.startsWith('0x')) {
          try {
            addrFormatted = ethers.getAddress(freelancerId.toLowerCase());
          } catch {}
        }
        const userByAddress = await prisma.user.findFirst({
          where: { walletAddress: addrFormatted }
        });
        if (userByAddress) {
          freelancerId = userByAddress.id;
        } else if (freelancerId.startsWith('0x')) {
          const newUser = await prisma.user.create({
            data: {
              walletAddress: addrFormatted,
              nonce: Math.random().toString(36).substring(2),
              role: 'FREELANCER'
            }
          });
          freelancerId = newUser.id;
        }
      }
    }

    if (!freelancerId) {
      const err: any = new Error('Freelancer ID or wallet address is required');
      err.statusCode = 400;
      err.code = 'INVALID_FREELANCER';
      throw err;
    }

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

  /**
   * Generates a complete project plan and agreement draft from a high-level brief.
   */
  static async planFromBrief(
    creatorId: string,
    params: {
      brief: string;
      totalBudget?: number;
      currency?: string;
      freelancerId?: string;
      freelancerAddress?: string;
      repoUrl?: string;
    }
  ) {
    const client = await prisma.user.findUnique({ where: { id: creatorId } });
    if (!client) throw new Error('Client user not found');

    let freelancerId = params.freelancerId;
    if (!freelancerId && params.freelancerAddress) {
      let formattedAddr = params.freelancerAddress;
      try {
        formattedAddr = ethers.getAddress(params.freelancerAddress.toLowerCase());
      } catch {}
      const existingUser = await prisma.user.findFirst({ where: { walletAddress: formattedAddr } });
      if (existingUser) {
        freelancerId = existingUser.id;
      } else {
        const newUser = await prisma.user.create({
          data: {
            walletAddress: formattedAddr,
            nonce: Math.random().toString(36).substring(2),
            role: 'FREELANCER',
          },
        });
        freelancerId = newUser.id;
      }
    }

    if (!freelancerId) {
      const defaultFreelancer = await prisma.user.findFirst({
        where: { role: { in: ['FREELANCER', 'BOTH'] }, id: { not: creatorId } },
      });
      freelancerId = defaultFreelancer?.id || creatorId;
    }

    const freelancer = await prisma.user.findUnique({ where: { id: freelancerId } });

    // Call AI Adapter planFromBrief
    const planResult = await AiAdapter.planFromBrief({
      brief: params.brief,
      totalBudget: params.totalBudget || 1.0,
      currency: params.currency || 'ETH',
      clientAddress: client.walletAddress,
      freelancerAddress: freelancer?.walletAddress || '0x2222222222222222222222222222222222222222',
      repoUrl: params.repoUrl || 'https://github.com/fairwork-test/project-repo',
    });

    const rawTerms = planResult.terms;
    const terms = agreementTermsSchema.parse(rawTerms);

    const agreement = await prisma.agreement.create({
      data: {
        clientId: creatorId,
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

    return {
      agreement,
      rationale: planResult.rationale,
      suggestedTechStack: planResult.suggestedTechStack,
    };
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
      const err: any = new Error('Agreement not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
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
      const err: any = new Error('Agreement not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (agreement.clientId !== userId && agreement.freelancerId !== userId) {
      throw new Error('Unauthorized to link agreement');
    }

    if (agreement.status !== 'LOCKED' && agreement.status !== 'ONCHAIN_LINKED') {
      const err: any = new Error(
        'Agreement must be in LOCKED status with mutual approvals before linking on-chain'
      );
      err.statusCode = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }

    if (!agreement.canonicalHash) {
      const err: any = new Error('Missing canonical terms hash on agreement');
      err.statusCode = 400;
      err.code = 'MISSING_CANONICAL_HASH';
      throw err;
    }

    // Verify on-chain terms hash
    const { valid, onChainTermsHash } = await ChainAdapter.verifyTermsHash(
      params.onChainAgreementId,
      agreement.canonicalHash
    );

    if (!valid) {
      const err: any = new Error(
        `On-chain terms hash mismatch! On-chain: ${onChainTermsHash}, Local canonicalHash: ${agreement.canonicalHash}`
      );
      err.statusCode = 400;
      err.code = 'TERMS_HASH_MISMATCH';
      throw err;
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

  /**
   * Audits agreement terms for clarity, fairness, and pre-lock escrow risks.
   * Accepts either an agreement ID (auditing stored draft) or explicit terms (auditing unsaved draft).
   */
  static async auditAgreement(agreementId?: string, termsOverride?: any) {
    let termsToAudit: any = termsOverride;

    if (!termsToAudit && agreementId) {
      const agreement = await prisma.agreement.findUnique({
        where: { id: agreementId },
        include: { milestones: true },
      });

      if (!agreement) {
        const err: any = new Error('Agreement not found');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (agreement.termsJson) {
        try {
          termsToAudit = typeof agreement.termsJson === 'string'
            ? JSON.parse(agreement.termsJson)
            : agreement.termsJson;
        } catch {
          termsToAudit = null;
        }
      }

      if (!termsToAudit) {
        termsToAudit = {
          title: agreement.title,
          milestones: (agreement.milestones || []).map((m: any) => ({
            index: m.milestoneIndex,
            title: m.title,
            description: m.description,
            amount: String(m.amount),
            acceptanceCriteria: m.deliverables || [m.description || 'Deliverable verification'],
          })),
        };
      }
    }

    if (!termsToAudit) {
      const err: any = new Error('No agreement terms provided for audit');
      err.statusCode = 400;
      err.code = 'BAD_REQUEST';
      throw err;
    }

    return await AiAdapter.reviewAgreement(termsToAudit);
  }
}
