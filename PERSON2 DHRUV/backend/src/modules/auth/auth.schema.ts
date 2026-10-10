import { z } from 'zod';

export const nonceRequestSchema = z.object({
  walletAddress: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum wallet address format' }),
});

export const verifySignatureSchema = z.object({
  walletAddress: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum wallet address format' }),
  signature: z.string().trim().min(1, { message: 'Cryptographic signature is required' }),
});
