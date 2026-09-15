import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { KycGuard } from './kyc.guard';

function makeContext(user?: { walletAddress: string }) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('KycGuard', () => {
  it('rejects a request with no authenticated wallet', async () => {
    const userPortfolio = { isTradingAllowed: jest.fn() };
    const guard = new KycGuard(userPortfolio as any);
    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(ForbiddenException);
  });

  it('allows the request when the wallet is permitted to trade', async () => {
    const userPortfolio = { isTradingAllowed: jest.fn().mockResolvedValue(true) };
    const guard = new KycGuard(userPortfolio as any);
    await expect(guard.canActivate(makeContext({ walletAddress: 'GUSER' }))).resolves.toBe(true);
  });

  it('rejects the request when the wallet is not permitted to trade', async () => {
    const userPortfolio = { isTradingAllowed: jest.fn().mockResolvedValue(false) };
    const guard = new KycGuard(userPortfolio as any);
    await expect(guard.canActivate(makeContext({ walletAddress: 'GUSER' }))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
