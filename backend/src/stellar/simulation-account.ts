import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Shared by every contract-read service — see SOROBAN_SIMULATION_ACCOUNT in env.schema.ts. */
export function requireSimulationAccount(configService: ConfigService): string {
  const account = configService.get<string>('stellar.simulationAccount');
  if (!account) {
    throw new ServiceUnavailableException(
      'SOROBAN_SIMULATION_ACCOUNT is not configured — contract reads are unavailable until it is set',
    );
  }
  return account;
}
