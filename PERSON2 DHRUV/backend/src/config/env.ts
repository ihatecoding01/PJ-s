import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  JWT_SECRET: z.string().default('fairwork-super-secret-jwt-key-change-in-production-2026'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  AI_MOCK: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),
  AI_INTERNAL_KEY: z.string().default(''),
  CHAIN_MOCK: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
  RPC_URL: z.string().default('https://ethereum-sepolia-rpc.publicnode.com'),
  CHAIN_ID: z.coerce.number().default(11155111),
  CONTRACT_ADDRESS: z.string().default('0xc1C0415872eA86DfdA31615B9Ad94d795974CA1e'),
  ORACLE_PRIVATE_KEY: z
    .string()
    .default('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'),
  UPLOAD_DIR: z.string().default('./uploads'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
