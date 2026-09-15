import { OracleService } from './oracle.service';

function makeService() {
  const soroban = {
    callReadOnly: jest.fn().mockResolvedValue({ value: 12_500_000n, latestLedger: 1 }),
  };
  const registry = { requireAddress: jest.fn(() => 'CORACLE') };
  const configService = { get: jest.fn(() => 'GSIMULATIONACCOUNT') };
  return {
    service: new OracleService(soroban as any, registry as any, configService as any),
    soroban,
  };
}

describe('OracleService', () => {
  it('convertToBase passes amount and asset through to the contract', async () => {
    const { service, soroban } = makeService();
    const value = await service.convertToBase(100n, { code: 'XLM' });
    expect(soroban.callReadOnly).toHaveBeenCalledWith(
      'CORACLE',
      'convert_to_base',
      [100n, { code: 'XLM' }],
      'GSIMULATIONACCOUNT',
    );
    expect(value).toBe(12_500_000n);
  });

  it('checkOracleHeartbeat reads freshness for a given pair', async () => {
    const { service, soroban } = makeService();
    await service.checkOracleHeartbeat({ base: 'XLM', quote: 'USDC' });
    expect(soroban.callReadOnly).toHaveBeenCalledWith(
      'CORACLE',
      'check_oracle_heartbeat',
      [{ base: 'XLM', quote: 'USDC' }],
      'GSIMULATIONACCOUNT',
    );
  });
});
