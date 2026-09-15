import { ServiceUnavailableException } from '@nestjs/common';
import { UserPortfolioService } from './user-portfolio.service';

function makeService(opts: { address?: string } = { address: 'CUSERPORTFOLIO' }) {
  const soroban = { callReadOnly: jest.fn() };
  const values: Record<string, string | undefined> = {
    'stellar.userPortfolioContractAddress': opts.address,
    'stellar.simulationAccount': 'GSIMULATIONACCOUNT',
  };
  const configService = { get: (key: string) => values[key] };
  return { service: new UserPortfolioService(soroban as any, configService as any), soroban };
}

describe('UserPortfolioService', () => {
  it('throws ServiceUnavailableException when no address override is configured', async () => {
    const { service } = makeService({ address: undefined });
    await expect(service.getPnl('GUSER')).rejects.toThrow(ServiceUnavailableException);
  });

  it('isTradingAllowed returns true when KYC is not required, without checking verification', async () => {
    const { service, soroban } = makeService();
    soroban.callReadOnly.mockResolvedValueOnce({ value: false, latestLedger: 1 }); // get_kyc_required_mode

    const allowed = await service.isTradingAllowed('GUSER');

    expect(allowed).toBe(true);
    expect(soroban.callReadOnly).toHaveBeenCalledTimes(1);
  });

  it('isTradingAllowed checks verification when KYC is required', async () => {
    const { service, soroban } = makeService();
    soroban.callReadOnly
      .mockResolvedValueOnce({ value: true, latestLedger: 1 }) // get_kyc_required_mode
      .mockResolvedValueOnce({ value: false, latestLedger: 1 }); // is_kyc_verified

    const allowed = await service.isTradingAllowed('GUSER');

    expect(allowed).toBe(false);
    expect(soroban.callReadOnly).toHaveBeenNthCalledWith(
      2,
      'CUSERPORTFOLIO',
      'is_kyc_verified',
      ['GUSER'],
      'GSIMULATIONACCOUNT',
    );
  });
});
