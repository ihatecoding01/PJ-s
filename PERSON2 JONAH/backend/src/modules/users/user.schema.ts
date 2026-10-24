import { z } from 'zod';

export const updateProfileSchema = z.object({
  role: z.enum(['CLIENT', 'FREELANCER', 'BOTH']).optional(),
  name: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(1000).optional(),
  skills: z.string().trim().max(500).optional(),
  githubUsername: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9-]+$/, { message: 'Invalid GitHub username format' })
    .max(50)
    .optional(),
});
