import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContractRegistryService } from '../../config/contract-registry.service';
import { SorobanClientService } from '../../stellar/soroban-client.service';
import { requireSimulationAccount } from '../../stellar/simulation-account';
import { CONTRACT_SLOTS } from '../contracts.constants';

@Injectable()
export class FeeCollectorService {
  constructor(
    private readonly soroban: SorobanClientService,
    private readonly registry: ContractRegistryService,
    private readonly configService: ConfigService,
  ) {}

  private address(): string {
    return this.registry.requireAddress(CONTRACT_SLOTS.FEE_COLLECTOR);
  }

  private simAccount(): string {
    return requireSimulationAccount(this.configService);
  }

  async getFeeRateForUser(user: string) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'fee_rate_for_user',
      [user],
      this.simAccount(),
    );
    return result.value;
  }

  async getMonthlyTradeVolume(user: string) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'monthly_trade_volume',
      [user],
      this.simAccount(),
    );
    return result.value;
  }

  async getTreasuryBalance(token: string) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'treasury_balance',
      [token],
      this.simAccount(),
    );
    return result.value;
  }

  async getFeeRate() {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'fee_rate',
      [],
      this.simAccount(),
    );
    return result.value;
  }

  async getCurrentDynamicFeeRate() {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'current_dynamic_fee_rate',
      [],
      this.simAccount(),
    );
    return result.value;
  }

  /** Builds the transaction for a signal provider claiming their accrued fee share for `token`. */
  async buildClaimFees(provider: string, token: string) {
    return this.soroban.buildInvocation(this.address(), 'claim_fees', [provider, token], provider);
  }

  async submitSignedTransaction(signedXdr: string) {
    return this.soroban.submitSignedTransaction(signedXdr);
  }
}
