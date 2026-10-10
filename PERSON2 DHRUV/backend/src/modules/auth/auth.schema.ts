import { z } from 'zod';

export const nonceRequestSchema = z
  .object({
    walletAddress: z.string().trim().optional(),
    address: z.string().trim().optional(),
  })
  .transform((data) => ({
    walletAddress: data.walletAddress || data.address || '',
  }))
  .refine((data) => /^0x[a-fA-F0-9]{40}$/i.test(data.walletAddress), {
    message: 'Invalid Ethereum wallet address format',
  });

export const verifySignatureSchema = z
  .object({
    walletAddress: z.string().trim().optional(),
    address: z.string().trim().optional(),
    signature: z.string().trim().min(1, { message: 'Cryptographic signature is required' }),
  })
  .transform((data) => ({
    walletAddress: data.walletAddress || data.address || '',
    signature: data.signature,
  }))
  .refine((data) => /^0x[a-fA-F0-9]{40}$/i.test(data.walletAddress), {
    message: 'Invalid Ethereum wallet address format',
  });
