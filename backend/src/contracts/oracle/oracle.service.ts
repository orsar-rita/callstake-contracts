import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContractRegistryService } from '../../config/contract-registry.service';
import { SorobanClientService } from '../../stellar/soroban-client.service';
import { requireSimulationAccount } from '../../stellar/simulation-account';
import { CONTRACT_SLOTS } from '../contracts.constants';

/**
 * Read-only by design: every write path on the oracle contract
 * (set_price, set_update_deviation_threshold, pause/unpause_category, ...)
 * is admin/guardian-gated, not something an end user or this backend
 * should ever be relaying on someone else's behalf.
 */
@Injectable()
export class OracleService {
  constructor(
    private readonly soroban: SorobanClientService,
    private readonly registry: ContractRegistryService,
    private readonly configService: ConfigService,
  ) {}

  private address(): string {
    return this.registry.requireAddress(CONTRACT_SLOTS.ORACLE);
  }

  private simAccount(): string {
    return requireSimulationAccount(this.configService);
  }

  async convertToBase(amount: bigint, asset: unknown) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'convert_to_base',
      [amount, asset],
      this.simAccount(),
    );
    return result.value;
  }

  async getBaseCurrency() {
    const result = await this.soroban.callReadOnly(this.address(), 'get_base_currency', [], this.simAccount());
    return result.value;
  }

  async checkOracleHeartbeat(pair: unknown) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'check_oracle_heartbeat',
      [pair],
      this.simAccount(),
    );
    return result.value;
  }

  async getHistoricalPrice(pair: unknown, timestamp: number) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'get_historical_price',
      [pair, timestamp],
      this.simAccount(),
    );
    return result.value;
  }

  async isUpdateDeviationBreakerTripped(pair: unknown) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'is_update_dev_breaker_tripped',
      [pair],
      this.simAccount(),
    );
    return result.value;
  }
}
