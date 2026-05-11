import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z
    .string({ error: 'DATABASE_URL is required' })
    .min(1, 'DATABASE_URL must not be empty')
    .refine(
      url => /^postgres(ql)?:\/\//i.test(url),
      'DATABASE_URL must be a PostgreSQL connection URL (postgres:// or postgresql://)'
    ),
  JWT_SECRET: z
    .string({ error: 'JWT_SECRET is required' })
    .min(32, 'JWT_SECRET must be at least 32 characters'),
  PORT: z.preprocess(
    val => (val === undefined || val === '' ? '3000' : val),
    z.coerce
      .number()
      .int()
      .min(1, 'PORT must be at least 1')
      .max(65535, 'PORT must be at most 65535')
  ),
});

export const env = envSchema.parse(process.env);
