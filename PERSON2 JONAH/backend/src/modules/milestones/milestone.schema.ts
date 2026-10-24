import { z } from 'zod';

export const submitMilestoneSchema = z.object({
  repoUrl: z.string().trim().optional(),
  prUrl: z.string().trim().optional(),
  commitSha: z.string().trim().max(64).optional(),
  notes: z.string().trim().max(2000).optional(),
  deliverableType: z.enum(['CODE', 'DESIGN', 'DOCUMENT', 'URL']).default('CODE').optional(),
  deliverableContent: z.string().trim().max(10000).optional(),
  assetUrl: z.string().trim().optional(),
});

export const reviewMilestoneSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  feedback: z.string().trim().max(2000).optional(),
});
