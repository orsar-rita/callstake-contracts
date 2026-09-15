import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContractRegistryService } from '../../config/contract-registry.service';
import { SorobanClientService } from '../../stellar/soroban-client.service';
import { requireSimulationAccount } from '../../stellar/simulation-account';
import { CONTRACT_SLOTS } from '../contracts.constants';
import { CreateSignalInput } from './dto/create-signal.dto';

@Injectable()
export class SignalRegistryService {
  constructor(
    private readonly soroban: SorobanClientService,
    private readonly registry: ContractRegistryService,
    private readonly configService: ConfigService,
  ) {}

  private address(): string {
    return this.registry.requireAddress(CONTRACT_SLOTS.SIGNAL_REGISTRY);
  }

  async getSignal(signalId: number) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'get_signal',
      [signalId],
      requireSimulationAccount(this.configService),
    );
    return result.value;
  }

  async getSignalQualityScore(signalId: number) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'get_signal_quality_score',
      [signalId],
      requireSimulationAccount(this.configService),
    );
    return result.value;
  }

  async getProviderReputationScore(provider: string) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'get_provider_reputation_score',
      [provider],
      requireSimulationAccount(this.configService),
    );
    return result.value;
  }

  async getProviderStats(provider: string) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'get_provider_stats',
      [provider],
      requireSimulationAccount(this.configService),
    );
    return result.value;
  }

  async getTopProviders(limit: number) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'get_top_providers',
      [limit],
      requireSimulationAccount(this.configService),
    );
    return result.value;
  }

  async isProviderBanned(provider: string) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'is_provider_banned',
      [provider],
      requireSimulationAccount(this.configService),
    );
    return result.value;
  }

  /**
   * Builds (unsigned) the transaction for create_signal. NOTE: asset_pair,
   * rationale and tags are plain strings/vectors and encode unambiguously.
   * action/category/risk_level are the contract's custom Soroban enums
   * (SignalAction/SignalCategory/RiskLevel in
   * call-stake/contracts/signal_registry/src/types.rs) — they are passed
   * through generically here via the SDK's nativeToScVal, which is exact
   * for primitives but has NOT been verified against those contracts'
   * exact enum XDR encoding (that requires the contract's compiled spec,
   * which isn't wired in). Treat signal creation as unverified until that
   * gap is closed — see docs/BACKEND_SCOPE.md.
   */
  async buildCreateSignal(input: CreateSignalInput) {
    return this.soroban.buildInvocation(
      this.address(),
      'create_signal',
      [
        input.provider,
        input.assetPair,
        input.action,
        input.price,
        input.rationale,
        input.expiry,
        input.category,
        input.tags,
        input.riskLevel,
      ],
      input.provider,
    );
  }

  async submitSignedTransaction(signedXdr: string) {
    return this.soroban.submitSignedTransaction(signedXdr);
  }
}
