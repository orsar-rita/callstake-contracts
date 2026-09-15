import { validateEnv } from './env.schema';

export default function configuration() {
  const env = validateEnv(process.env);

  return {
    env: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    database: {
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      username: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      database: env.DATABASE_NAME,
      ssl: env.DATABASE_SSL,
    },
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
    },
    jwt: {
      secret: env.JWT_SECRET,
      issuer: env.JWT_ISSUER,
      expiresIn: env.JWT_EXPIRES_IN,
    },
    auth: {
      challengeTtlSeconds: env.AUTH_CHALLENGE_TTL_SECONDS,
    },
    stellar: {
      network: env.STELLAR_NETWORK,
      contractRegistryPath: env.CONTRACT_REGISTRY_PATH,
      simulationAccount: env.SOROBAN_SIMULATION_ACCOUNT,
      userPortfolioContractAddress: env.USER_PORTFOLIO_CONTRACT_ADDRESS,
    },
  };
}

export type AppConfiguration = ReturnType<typeof configuration>;
