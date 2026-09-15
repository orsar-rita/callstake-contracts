import { Injectable, Logger } from '@nestjs/common';
import { FeeCollectorService } from '../contracts/fee-collector/fee-collector.service';
import { StakeVaultService } from '../contracts/stake-vault/stake-vault.service';

export interface ProtocolStats {
  minimumStake: unknown;
  currentFeeRateBps: unknown;
  treasuryBalanceByToken: Record<string, unknown | { error: string }>;
}

/**
 * Deliberately minimal: composes reads already exposed by stake_vault and
 * fee_collector into one "protocol stats" response, rather than a real
 * analytics engine (no TVL time series, no risk scoring, no query
 * caching layer of its own — see contracts/analytics/ on the Rust side,
 * which this module does not integrate with at all, since it isn't
 * addressed in the deployment registry any more than user_portfolio is).
 * See docs/BACKEND_SCOPE.md.
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly stakeVault: StakeVaultService,
    private readonly feeCollector: FeeCollectorService,
  ) {}

  async getProtocolStats(trackedTokens: string[]): Promise<ProtocolStats> {
    const [minimumStake, currentFeeRateBps] = await Promise.all([
      this.stakeVault.getMinimumStake(),
      this.feeCollector.getCurrentDynamicFeeRate(),
    ]);

    const treasuryBalanceByToken: ProtocolStats['treasuryBalanceByToken'] = {};
    await Promise.all(
      trackedTokens.map(async (token) => {
        try {
          treasuryBalanceByToken[token] = await this.feeCollector.getTreasuryBalance(token);
        } catch (error) {
          this.logger.warn(`Treasury balance lookup failed for ${token}: ${(error as Error).message}`);
          treasuryBalanceByToken[token] = { error: (error as Error).message };
        }
      }),
    );

    return { minimumStake, currentFeeRateBps, treasuryBalanceByToken };
  }
}
