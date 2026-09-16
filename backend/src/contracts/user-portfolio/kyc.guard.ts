import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserPortfolioService } from './user-portfolio.service';

/**
 * Blocks a request unless the caller's wallet is allowed to trade per the
 * on-chain KYC gate (see UserPortfolioService.isTradingAllowed). Intended
 * for future trade-relay endpoints (auto_trade/trade_executor) — none
 * exist yet. The trade_executor deployment slot itself is now fixed (see
 * docs/CONTRACT_BUILD_DIAGNOSIS.md), but the order-submission relay
 * module was deferred pending that fix and hasn't been built yet (see
 * docs/BACKEND_SCOPE.md), so nothing applies this guard today — the
 * gating logic itself is real and tested so it's ready when that module
 * lands.
 */
@Injectable()
export class KycGuard implements CanActivate {
  constructor(private readonly userPortfolio: UserPortfolioService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const walletAddress: string | undefined = request.user?.walletAddress;
    if (!walletAddress) {
      throw new ForbiddenException('No authenticated wallet on this request');
    }

    const allowed = await this.userPortfolio.isTradingAllowed(walletAddress);
    if (!allowed) {
      throw new ForbiddenException('This action requires KYC verification');
    }
    return true;
  }
}
