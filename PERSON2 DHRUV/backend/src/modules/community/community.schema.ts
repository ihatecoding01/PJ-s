import { z } from 'zod';

export const createPostSchema = z.object({
  type: z.enum(['JOB', 'SERVICE']),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
  budget: z.number().positive(),
  tags: z.array(z.string()).optional(),
});

export const searchPostQuerySchema = z.object({
  type: z.enum(['JOB', 'SERVICE']).optional(),
  status: z.string().optional(),
  tag: z.string().optional(),
  query: z.string().optional(),
});

export const submitProposalSchema = z.object({
  coverLetter: z.string().trim().min(10).max(4000),
  proposedBudget: z.number().positive(),
  proposedDuration: z.string().trim().min(1).max(100),
});

export const createThreadSchema = z.object({
  postId: z.string().optional(),
  recipientId: z.string().min(1),
  subject: z.string().trim().min(2).max(200),
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});
