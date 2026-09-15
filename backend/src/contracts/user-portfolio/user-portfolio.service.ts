import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SorobanClientService } from '../../stellar/soroban-client.service';
import { requireSimulationAccount } from '../../stellar/simulation-account';

/**
 * The real user_portfolio crate (positions, PnL, KYC gating — see
 * call-stake/contracts/user_portfolio/src/lib.rs) has no deployment slot
 * anywhere in this repo's registry/manifest: the manifest's
 * "user_portfolio" slot actually deploys the auto_trade package instead
 * (see ContractRegistryService's doc comment). Rather than guess at an
 * address or silently call the wrong contract, this module requires an
 * explicit USER_PORTFOLIO_CONTRACT_ADDRESS override and fails loudly
 * (503) until it's set — matching this repo's own documented convention
 * for an undeployed contract (see ContractNotDeployedError).
 *
 * Scope is intentionally narrow: portfolio/PnL reads and the two KYC
 * gate checks the contract exposes. No position writes (open/close) —
 * those involve price/amount arguments this module hasn't modeled and
 * are lower priority than getting the read path and the KYC gate right
 * first. See docs/BACKEND_SCOPE.md.
 */
@Injectable()
export class UserPortfolioService {
  constructor(
    private readonly soroban: SorobanClientService,
    private readonly configService: ConfigService,
  ) {}

  private address(): string {
    const address = this.configService.get<string>('stellar.userPortfolioContractAddress');
    if (!address) {
      throw new ServiceUnavailableException(
        'USER_PORTFOLIO_CONTRACT_ADDRESS is not configured — the user_portfolio crate has no ' +
          'tracked deployment slot in deployments/registry.json yet',
      );
    }
    return address;
  }

  private simAccount(): string {
    return requireSimulationAccount(this.configService);
  }

  async getPortfolio(user: string, includeClosed: boolean) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'get_portfolio',
      [user, includeClosed],
      this.simAccount(),
    );
    return result.value;
  }

  async getPnl(user: string) {
    const result = await this.soroban.callReadOnly(this.address(), 'get_pnl', [user], this.simAccount());
    return result.value;
  }

  async isKycVerified(user: string): Promise<boolean> {
    const result = await this.soroban.callReadOnly<boolean>(
      this.address(),
      'is_kyc_verified',
      [user],
      this.simAccount(),
    );
    return result.value;
  }

  async isKycRequired(): Promise<boolean> {
    const result = await this.soroban.callReadOnly<boolean>(
      this.address(),
      'get_kyc_required_mode',
      [],
      this.simAccount(),
    );
    return result.value;
  }

  /** True if this user is allowed to trade right now: either KYC isn't required at all, or they're verified. */
  async isTradingAllowed(user: string): Promise<boolean> {
    const required = await this.isKycRequired();
    if (!required) {
      return true;
    }
    return this.isKycVerified(user);
  }
}
