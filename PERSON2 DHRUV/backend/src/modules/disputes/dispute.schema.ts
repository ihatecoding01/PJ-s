import { z } from 'zod';

export const createDisputeSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  reason: z.string().trim().min(10, 'Dispute reason must be at least 10 characters').max(3000),
});

export const resolveDisputeSchema = z.object({
  resolution: z.string().trim().min(5),
  clientRefund: z.number().nonnegative().optional(),
  freelancerPayout: z.number().nonnegative().optional(),
});
