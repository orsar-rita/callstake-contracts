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
   * Builds (unsigned) the transaction for create_signal. action/category/
   * risk_level are the contract's custom Soroban enums (SignalAction/
   * SignalCategory/RiskLevel in call-stake/contracts/signal_registry/src/types.rs)
   * — all three are unit-variant unions (no associated data), so each is
   * passed as `{ tag: <variant name> }`. Encoding goes through
   * buildInvocationWithSpec, which uses the contract's real compiled spec
   * (see contract-spec-registry.ts) rather than the generic nativeToScVal
   * used elsewhere, which cannot represent a union type from a bare string
   * (confirmed: it produces scvString, not the scvVec([scvSymbol]) a union
   * argument actually requires — see docs/CONTRACT_BUILD_DIAGNOSIS.md).
   */
  async buildCreateSignal(input: CreateSignalInput) {
    return this.soroban.buildInvocationWithSpec(
      'signal_registry',
      this.address(),
      'create_signal',
      {
        provider: input.provider,
        asset_pair: input.assetPair,
        action: { tag: input.action },
        price: input.price,
        rationale: input.rationale,
        expiry: input.expiry,
        category: { tag: input.category },
        tags: input.tags,
        risk_level: { tag: input.riskLevel },
      },
      input.provider,
    );
  }

  async submitSignedTransaction(signedXdr: string) {
    return this.soroban.submitSignedTransaction(signedXdr);
  }
}
