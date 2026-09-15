import { z } from 'zod';

/**
 * Validates process.env at startup. Fails fast with a readable error
 * instead of letting a missing/malformed var surface later as a runtime
 * crash somewhere unrelated.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().int().positive().default(5432),
  DATABASE_USER: z.string().default('callstake'),
  DATABASE_PASSWORD: z.string().default('callstake'),
  DATABASE_NAME: z.string().default('callstake'),
  DATABASE_SSL: z.coerce.boolean().default(false),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_ISSUER: z.string().default('callstake-backend'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  AUTH_CHALLENGE_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  STELLAR_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
  CONTRACT_REGISTRY_PATH: z.string().optional(),
  // A funded account used only to build/simulate read-only contract calls
  // (Soroban requires a real source account to construct a transaction
  // envelope, even for a call that charges no fee). Never used to sign
  // anything — see SorobanClientService.
  SOROBAN_SIMULATION_ACCOUNT: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
