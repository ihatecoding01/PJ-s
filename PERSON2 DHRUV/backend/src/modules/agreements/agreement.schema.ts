import { z } from 'zod';

export const draftAgreementRequestSchema = z.object({
  threadId: z.string().optional(),
  postId: z.string().optional(),
  clientId: z.string().optional(),
  freelancerId: z.string().min(1, 'Freelancer ID is required'),
  title: z.string().trim().max(200).optional(),
});

export const milestoneTermSchema = z.object({
  milestoneIndex: z.number().int().nonnegative(),
  title: z.string().trim().min(3),
  description: z.string().trim().min(5),
  amount: z.number().positive(),
  deadlineDays: z.number().positive(),
  deliverables: z.array(z.string()).optional(),
});

export const agreementTermsSchema = z.object({
  title: z.string().trim().min(3),
  summary: z.string().trim().min(5),
  totalBudget: z.number().positive(),
  currency: z.string().default('USDC'),
  revisionPolicy: z.string().trim().min(5),
  cancellationPolicy: z.string().trim().min(5),
  milestones: z.array(milestoneTermSchema).min(1, 'At least one milestone is required'),
});

export const editAgreementSchema = z.object({
  title: z.string().trim().max(200).optional(),
  terms: agreementTermsSchema,
});
