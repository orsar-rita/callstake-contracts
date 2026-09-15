import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  it('combines stake vault and fee collector reads into one response', async () => {
    const stakeVault = { getMinimumStake: jest.fn().mockResolvedValue(10_000_000n) };
    const feeCollector = {
      getCurrentDynamicFeeRate: jest.fn().mockResolvedValue(250),
      getTreasuryBalance: jest.fn().mockResolvedValue(999_000n),
    };
    const service = new AnalyticsService(stakeVault as any, feeCollector as any);

    const stats = await service.getProtocolStats(['CTOKEN1']);

    expect(stats.minimumStake).toBe(10_000_000n);
    expect(stats.currentFeeRateBps).toBe(250);
    expect(stats.treasuryBalanceByToken).toEqual({ CTOKEN1: 999_000n });
  });

  it('reports a per-token error instead of failing the whole response when one lookup fails', async () => {
    const stakeVault = { getMinimumStake: jest.fn().mockResolvedValue(1n) };
    const feeCollector = {
      getCurrentDynamicFeeRate: jest.fn().mockResolvedValue(100),
      getTreasuryBalance: jest.fn().mockRejectedValue(new Error('contract not deployed')),
    };
    const service = new AnalyticsService(stakeVault as any, feeCollector as any);

    const stats = await service.getProtocolStats(['CBAD']);

    expect(stats.treasuryBalanceByToken.CBAD).toEqual({ error: 'contract not deployed' });
  });
});
