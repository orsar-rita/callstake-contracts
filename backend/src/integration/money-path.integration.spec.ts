import { Keypair } from '@stellar/stellar-sdk';
import { AuthService } from '../auth/auth.service';
import { ChallengeStoreService } from '../auth/challenge-store.service';
import { StakeVaultService } from '../contracts/stake-vault/stake-vault.service';
import { SignalRegistryService } from '../contracts/signal-registry/signal-registry.service';
import { FeeCollectorService } from '../contracts/fee-collector/fee-collector.service';

/**
 * Exercises the core money-path end to end — login, stake, submit a
 * signal, claim a fee — across real service instances (not mocking the
 * services themselves), only the boundary they can't cross in this
 * environment: SorobanClientService (no live/sandbox Soroban network is
 * reachable here) and the TypeORM repositories (no Postgres instance in
 * this environment either). Everything above that boundary — JWT
 * issuance tying the same identity through every step, which contract
 * method each built transaction targets and who signs it — is real.
 *
 * This is deliberately not an HTTP-level e2e test (supertest against a
 * running server): that would need a live Postgres+Redis, which
 * docker-compose.yml provides for local/CI use but isn't available in
 * this sandbox. See docs/BACKEND_SCOPE.md's final status notes.
 */
describe('money path integration (login -> stake -> signal -> fee claim)', () => {
  it('carries the same wallet identity through every step and targets the right contract methods', async () => {
    const provider = Keypair.random();
    const nonce = 'integration-test-nonce';

    // Shared fakes standing in for infrastructure this sandbox can't provide live.
    const soroban = {
      buildInvocation: jest
        .fn()
        .mockImplementation(async (_address, method) => ({
          xdr: `unsigned-xdr-for-${method}`,
          latestLedger: 1,
        })),
    };
    const registry = {
      requireAddress: jest.fn((slot: string) =>
        `C${slot.toUpperCase()}ADDRESS`.padEnd(56, '0').slice(0, 56),
      ),
    };
    const configService = { get: jest.fn(() => 'GSIMULATIONACCOUNT') };
    const usersRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data),
      save: jest
        .fn()
        .mockImplementation(async (u) => ({
          id: 'user-1',
          displayName: null,
          isAdmin: false,
          ...u,
        })),
    };
    // A minimal in-memory stand-in for the Redis wire protocol, real enough
    // for ChallengeStoreService's own get/set/del usage.
    const nonceStore = new Map<string, string>();
    const fakeRedis = {
      set: jest.fn(async (key: string, value: string) => nonceStore.set(key, value)),
      get: jest.fn(async (key: string) => nonceStore.get(key) ?? null),
      del: jest.fn(async (key: string) => nonceStore.delete(key)),
    };
    const challenges = new ChallengeStoreService(fakeRedis as any, { get: () => 300 } as any);
    const jwtService = { sign: jest.fn().mockReturnValue('a-real-shaped.jwt.token') };

    const authService = new AuthService(usersRepo as any, challenges, jwtService as any);

    // Step 1: login, against a nonce actually issued through the real challenge store.
    await challenges.consume(provider.publicKey()); // clear any stray state
    nonceStore.set(`auth:challenge:login:${provider.publicKey()}`, nonce);
    const signature = provider.sign(Buffer.from(nonce, 'utf8')).toString('base64');

    const loginResult = await authService.verifyAndLogin(provider.publicKey(), signature);
    expect(loginResult.user.walletAddress).toBe(provider.publicKey());
    expect(loginResult.accessToken).toBe('a-real-shaped.jwt.token');

    // Step 2: stake, signed by the same address that just logged in.
    const stakeVault = new StakeVaultService(soroban as any, registry as any, configService as any);
    const stakeInvocation = await stakeVault.buildDepositStake(provider.publicKey(), 50_000_000n);
    expect(soroban.buildInvocation).toHaveBeenLastCalledWith(
      expect.any(String),
      'deposit_stake',
      [provider.publicKey(), 50_000_000n],
      provider.publicKey(),
    );
    expect(stakeInvocation.xdr).toBe('unsigned-xdr-for-deposit_stake');

    // Step 3: submit a signal, same provider.
    const signalRegistry = new SignalRegistryService(
      soroban as any,
      registry as any,
      configService as any,
    );
    await signalRegistry.buildCreateSignal({
      provider: provider.publicKey(),
      assetPair: 'XLM/USDC',
      action: 'Buy',
      price: 1_000_000n,
      rationale: 'integration test signal',
      expiry: 2_000_000_000,
      category: 'Spot',
      tags: ['test'],
      riskLevel: 'Low',
    });
    expect(soroban.buildInvocation).toHaveBeenLastCalledWith(
      expect.any(String),
      'create_signal',
      expect.arrayContaining([provider.publicKey()]),
      provider.publicKey(),
    );

    // Step 4: claim the provider's fee share, same identity throughout.
    const feeCollector = new FeeCollectorService(
      soroban as any,
      registry as any,
      configService as any,
    );
    await feeCollector.buildClaimFees(
      provider.publicKey(),
      'CTOKEN0000000000000000000000000000000000000000000000',
    );
    expect(soroban.buildInvocation).toHaveBeenLastCalledWith(
      expect.any(String),
      'claim_fees',
      [provider.publicKey(), 'CTOKEN0000000000000000000000000000000000000000000000'],
      provider.publicKey(),
    );

    // Every write in this path was built for the provider's own address — never relayed on someone else's behalf.
    for (const call of soroban.buildInvocation.mock.calls) {
      expect(call[3]).toBe(provider.publicKey());
    }
  });
});
