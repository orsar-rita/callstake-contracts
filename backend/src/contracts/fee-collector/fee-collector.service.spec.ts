import { FeeCollectorService } from './fee-collector.service';

function makeService() {
  const soroban = {
    callReadOnly: jest.fn().mockResolvedValue({ value: 250, latestLedger: 1 }),
    buildInvocation: jest.fn().mockResolvedValue({ xdr: 'AAAA', latestLedger: 1 }),
    submitSignedTransaction: jest.fn(),
  };
  const registry = { requireAddress: jest.fn(() => 'CFEECOLLECTOR') };
  const configService = { get: jest.fn(() => 'GSIMULATIONACCOUNT') };
  return { service: new FeeCollectorService(soroban as any, registry as any, configService as any), soroban };
}

describe('FeeCollectorService', () => {
  it('getFeeRateForUser reads the per-user rate in basis points', async () => {
    const { service, soroban } = makeService();
    const rate = await service.getFeeRateForUser('GUSER');
    expect(soroban.callReadOnly).toHaveBeenCalledWith(
      'CFEECOLLECTOR',
      'fee_rate_for_user',
      ['GUSER'],
      'GSIMULATIONACCOUNT',
    );
    expect(rate).toBe(250);
  });

  it('buildClaimFees builds an invocation signed by the claiming provider', async () => {
    const { service, soroban } = makeService();
    await service.buildClaimFees('GPROVIDER', 'CTOKEN');
    expect(soroban.buildInvocation).toHaveBeenCalledWith(
      'CFEECOLLECTOR',
      'claim_fees',
      ['GPROVIDER', 'CTOKEN'],
      'GPROVIDER',
    );
  });
});
