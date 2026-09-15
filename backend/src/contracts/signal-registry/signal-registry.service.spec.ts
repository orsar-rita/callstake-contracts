import { ServiceUnavailableException } from '@nestjs/common';
import { ContractNotDeployedError } from '../../config/contract-registry.service';
import { SignalRegistryService } from './signal-registry.service';

function makeService(opts: { address?: string | null; simulationAccount?: string } = {}) {
  const soroban = {
    callReadOnly: jest.fn().mockResolvedValue({ value: { id: 1 }, latestLedger: 10 }),
    buildInvocation: jest.fn().mockResolvedValue({ xdr: 'AAAA', latestLedger: 10 }),
    submitSignedTransaction: jest.fn().mockResolvedValue({ hash: 'h', status: 'PENDING' }),
  };
  const registry = {
    requireAddress: jest.fn(() => {
      if (opts.address === null) {
        throw new ContractNotDeployedError('signal_registry', 'testnet');
      }
      return opts.address ?? 'CSIGNALREGISTRYADDRESS';
    }),
  };
  const configService = {
    get: jest.fn(() => opts.simulationAccount ?? 'GSIMULATIONACCOUNT'),
  };
  const service = new SignalRegistryService(soroban as any, registry as any, configService as any);
  return { service, soroban, registry, configService };
}

describe('SignalRegistryService', () => {
  it('getSignal calls the contract with the given id and returns the decoded value', async () => {
    const { service, soroban } = makeService();
    const result = await service.getSignal(42);

    expect(soroban.callReadOnly).toHaveBeenCalledWith(
      'CSIGNALREGISTRYADDRESS',
      'get_signal',
      [42],
      'GSIMULATIONACCOUNT',
    );
    expect(result).toEqual({ id: 1 });
  });

  it('propagates ContractNotDeployedError when the contract has no address configured', async () => {
    const { service } = makeService({ address: null });
    await expect(service.getSignal(1)).rejects.toThrow(ContractNotDeployedError);
  });

  it('propagates a clear error when SOROBAN_SIMULATION_ACCOUNT is unset', async () => {
    const { service, configService } = makeService();
    configService.get.mockReturnValue(undefined);
    await expect(service.getSignal(1)).rejects.toThrow(ServiceUnavailableException);
  });

  it('buildCreateSignal passes structured args through to buildInvocation', async () => {
    const { service, soroban } = makeService();
    await service.buildCreateSignal({
      provider: 'GPROVIDER',
      assetPair: 'XLM/USDC',
      action: 'Buy',
      price: 12345n,
      rationale: 'looks bullish',
      expiry: 1893456000,
      category: 'Spot',
      tags: ['momentum'],
      riskLevel: 'Medium',
    });

    expect(soroban.buildInvocation).toHaveBeenCalledWith(
      'CSIGNALREGISTRYADDRESS',
      'create_signal',
      ['GPROVIDER', 'XLM/USDC', 'Buy', 12345n, 'looks bullish', 1893456000, 'Spot', ['momentum'], 'Medium'],
      'GPROVIDER',
    );
  });

  it('submitSignedTransaction relays to the soroban client', async () => {
    const { service, soroban } = makeService();
    const result = await service.submitSignedTransaction('signed-xdr');
    expect(soroban.submitSignedTransaction).toHaveBeenCalledWith('signed-xdr');
    expect(result).toEqual({ hash: 'h', status: 'PENDING' });
  });
});
