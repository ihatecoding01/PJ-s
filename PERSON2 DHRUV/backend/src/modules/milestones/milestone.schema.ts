import { z } from 'zod';

export const submitMilestoneSchema = z.object({
  repoUrl: z.string().trim().url('Valid GitHub or repository URL is required'),
  commitSha: z.string().trim().max(64).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const reviewMilestoneSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  feedback: z.string().trim().max(2000).optional(),
});
