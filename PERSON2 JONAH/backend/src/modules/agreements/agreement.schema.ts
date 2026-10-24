import { z } from 'zod';

export const draftAgreementRequestSchema = z
  .object({
    threadId: z.string().optional(),
    postId: z.string().optional(),
    clientId: z.string().optional(),
    freelancerId: z.string().optional(),
    freelancerAddress: z.string().optional(),
    freelancerWallet: z.string().optional(),
    title: z.string().trim().max(200).optional(),
  })
  .transform((data) => {
    const fId = data.freelancerId || data.freelancerAddress || data.freelancerWallet || '';
    return {
      ...data,
      freelancerId: fId,
    };
  });

export const planFromBriefRequestSchema = z.object({
  brief: z.string().trim().min(5),
  totalBudget: z.number().positive().optional(),
  currency: z.string().optional(),
  freelancerId: z.string().optional(),
  freelancerAddress: z.string().optional(),
  repoUrl: z.string().optional(),
});

export const milestoneTermSchema = z
  .object({
    milestoneIndex: z.number().int().nonnegative().optional(),
    index: z.number().int().nonnegative().optional(),
    title: z.string().trim().min(1),
    description: z.string().trim().default(''),
    amount: z.union([z.number().positive(), z.string().min(1)]),
    deadlineDays: z.number().positive().optional(),
    deadline: z.union([z.string(), z.number()]).optional(),
    deliverables: z.array(z.string()).optional(),
    acceptanceCriteria: z.array(z.string()).optional(),
    requiredProgressBps: z.number().int().min(0).max(10000).default(8000),
  })
  .transform((data) => {
    const idx = data.index ?? data.milestoneIndex ?? 0;
    const amtNum = typeof data.amount === 'number' ? data.amount : parseFloat(data.amount) || 0;
    const deliverables = data.acceptanceCriteria || data.deliverables || [];
    return {
      index: idx,
      milestoneIndex: idx,
      title: data.title,
      description: data.description,
      amount: amtNum,
      amountStr: String(data.amount),
      deadlineDays: data.deadlineDays || 7,
      deadline: data.deadline,
      deliverables,
      acceptanceCriteria: deliverables,
      requiredProgressBps: data.requiredProgressBps,
    };
  });

export const agreementTermsSchema = z
  .object({
    schemaVersion: z.string().default('1.0'),
    title: z.string().trim().min(1),
    summary: z.string().trim().optional(),
    description: z.string().trim().optional(),
    client: z.string().optional(),
    freelancer: z.string().optional(),
    totalBudget: z.number().positive().optional(),
    totalAmount: z.union([z.string(), z.number()]).optional(),
    currency: z.string().default('ETH'),
    paymentMode: z.enum(['MILESTONE', 'LUMP_SUM']).default('MILESTONE'),
    latePenaltyBpsPerDay: z.number().int().min(0).max(10000).default(100),
    maxLatePenaltyBps: z.number().int().min(0).max(10000).default(3000),
    reviewWindowDays: z.number().int().min(1).default(5),
    graceDays: z.number().int().min(0).default(3),
    maxRevisions: z.number().int().min(0).default(2),
    revisionPolicy: z.string().trim().optional(),
    cancellationPolicy: z.string().trim().optional(),
    github: z
      .object({
        repoUrl: z.string().default(''),
        branch: z.string().default('main'),
      })
      .default({ repoUrl: '', branch: 'main' }),
    milestones: z.array(milestoneTermSchema).min(1, 'At least one milestone is required'),
    createdAt: z.string().optional(),
  })
  .transform((data) => {
    const summary = data.summary || data.description || data.title;
    const totalAmount = data.totalAmount
      ? String(data.totalAmount)
      : data.totalBudget
      ? String(data.totalBudget)
      : String(data.milestones.reduce((acc, m) => acc + m.amount, 0));
    const totalBudget = parseFloat(totalAmount) || 0;

    return {
      schemaVersion: data.schemaVersion,
      title: data.title,
      summary,
      description: summary,
      client: data.client,
      freelancer: data.freelancer,
      totalBudget,
      totalAmount,
      currency: data.currency,
      paymentMode: data.paymentMode,
      latePenaltyBpsPerDay: data.latePenaltyBpsPerDay,
      maxLatePenaltyBps: data.maxLatePenaltyBps,
      reviewWindowDays: data.reviewWindowDays,
      graceDays: data.graceDays,
      maxRevisions: data.maxRevisions,
      revisionPolicy: data.revisionPolicy || `Up to ${data.maxRevisions} revision rounds per milestone within ${data.reviewWindowDays} days.`,
      cancellationPolicy: data.cancellationPolicy || 'Mutual consensus or Escrow arbitration upon formal dispute filing.',
      github: data.github,
      milestones: data.milestones,
      createdAt: data.createdAt || new Date().toISOString(),
    };
  });

export const editAgreementSchema = z.object({
  title: z.string().trim().max(200).optional(),
  terms: agreementTermsSchema,
});
