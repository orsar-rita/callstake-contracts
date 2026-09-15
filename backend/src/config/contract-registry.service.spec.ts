import { ConfigService } from '@nestjs/config';
import { ContractNotDeployedError, ContractRegistryService } from './contract-registry.service';

function makeService(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = { 'stellar.network': 'testnet', ...overrides };
  const configService = {
    get: (key: string, fallback?: unknown) => values[key] ?? fallback,
  } as ConfigService;
  const service = new ContractRegistryService(configService);
  service.onModuleInit();
  return service;
}

describe('ContractRegistryService', () => {
  it('loads the real testnet registry from the repo root', () => {
    const service = makeService();
    expect(service.getNetwork()).toBe('testnet');
    const rpc = service.getRpcConfig();
    expect(rpc.network_passphrase).toBe('Test SDF Network ; September 2015');
    expect(rpc.primary_rpc).toContain('soroban-testnet.stellar.org');
  });

  it('reports registry-tracked contracts as undeployed while address is null', () => {
    const service = makeService();
    const resolved = service.resolve('signal_registry');
    expect(resolved.source).toBe('registry');
    expect(resolved.deployed).toBe(false);
    expect(resolved.address).toBeNull();
  });

  it('resolves the package field even when the manifest slot name differs from the crate name', () => {
    const service = makeService();
    // deployments/testnet.manifest.json maps the "user_portfolio" slot to
    // the "auto_trade" package and "trade_executor" slot to "bridge" —
    // callers must trust .package, not the slot key.
    const userPortfolioSlot = service.resolve('user_portfolio');
    expect(userPortfolioSlot.package).toBe('auto_trade');
    const tradeExecutorSlot = service.resolve('trade_executor');
    expect(tradeExecutorSlot.package).toBe('bridge');
  });

  it('falls back to config/<network>.json for the oracle address when not in the registry', () => {
    const service = makeService();
    const resolved = service.resolve('oracle');
    expect(resolved.source).toBe('static-config');
    expect(resolved.deployed).toBe(true);
    expect(resolved.address).toMatch(/^G[A-Z0-9]{55}$/);
  });

  it('reports governance/analytics as unconfigured — no address anywhere in the repo yet', () => {
    const service = makeService();
    expect(service.resolve('governance').source).toBe('unconfigured');
    expect(service.resolve('analytics').source).toBe('unconfigured');
  });

  it('requireAddress throws ContractNotDeployedError for an undeployed contract', () => {
    const service = makeService();
    expect(() => service.requireAddress('stake_vault')).toThrow(ContractNotDeployedError);
  });

  it('listAll includes both registry-tracked and static-only slots', () => {
    const service = makeService();
    const slots = service.listAll().map((c) => c.key);
    expect(slots).toEqual(
      expect.arrayContaining(['stake_vault', 'signal_registry', 'oracle', 'governance']),
    );
  });
});
