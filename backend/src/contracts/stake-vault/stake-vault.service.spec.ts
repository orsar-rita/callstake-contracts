import { StakeVaultService } from './stake-vault.service';

function makeService() {
  const soroban = {
    callReadOnly: jest.fn().mockResolvedValue({ value: 1_000_000n, latestLedger: 1 }),
    buildInvocation: jest.fn().mockResolvedValue({ xdr: 'AAAA', latestLedger: 1 }),
    submitSignedTransaction: jest.fn(),
  };
  const registry = { requireAddress: jest.fn(() => 'CSTAKEVAULT') };
  const configService = { get: jest.fn(() => 'GSIMULATIONACCOUNT') };
  return {
    service: new StakeVaultService(soroban as any, registry as any, configService as any),
    soroban,
  };
}

describe('StakeVaultService', () => {
  it('getStake reads the staker balance', async () => {
    const { service, soroban } = makeService();
    const value = await service.getStake('GSTAKER');
    expect(soroban.callReadOnly).toHaveBeenCalledWith(
      'CSTAKEVAULT',
      'get_stake',
      ['GSTAKER'],
      'GSIMULATIONACCOUNT',
    );
    expect(value).toBe(1_000_000n);
  });

  it('buildDepositStake builds an invocation signed by the staker themselves', async () => {
    const { service, soroban } = makeService();
    await service.buildDepositStake('GSTAKER', 500n);
    expect(soroban.buildInvocation).toHaveBeenCalledWith(
      'CSTAKEVAULT',
      'deposit_stake',
      ['GSTAKER', 500n],
      'GSTAKER',
    );
  });

  it('buildRequestWithdrawal and buildWithdrawStake target the right contract methods', async () => {
    const { service, soroban } = makeService();
    await service.buildRequestWithdrawal('GSTAKER');
    await service.buildWithdrawStake('GSTAKER');
    expect(soroban.buildInvocation).toHaveBeenNthCalledWith(
      1,
      'CSTAKEVAULT',
      'request_withdrawal',
      ['GSTAKER'],
      'GSTAKER',
    );
    expect(soroban.buildInvocation).toHaveBeenNthCalledWith(
      2,
      'CSTAKEVAULT',
      'withdraw_stake',
      ['GSTAKER'],
      'GSTAKER',
    );
  });
});
