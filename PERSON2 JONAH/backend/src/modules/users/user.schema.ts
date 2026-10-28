import { z } from 'zod';

export const updateProfileSchema = z.object({
  role: z.enum(['CLIENT', 'FREELANCER', 'BOTH']).optional(),
  name: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(1000).optional(),
  skills: z
    .union([z.string().trim().max(500), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val.join(', ') : val))
    .optional(),
  githubUsername: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9-]+$/, { message: 'Invalid GitHub username format' })
    .max(50)
    .optional(),
});
