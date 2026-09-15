import { ChallengeStoreService } from './challenge-store.service';

function makeRedisMock() {
  const store = new Map<string, string>();
  return {
    set: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    del: jest.fn(async (key: string) => {
      const existed = store.has(key);
      store.delete(key);
      return existed ? 1 : 0;
    }),
  };
}

describe('ChallengeStoreService', () => {
  it('issues a nonce and stores it with the configured TTL', async () => {
    const redis = makeRedisMock();
    const configService = { get: () => 120 } as any;
    const service = new ChallengeStoreService(redis as any, configService);

    const { nonce, expiresInSeconds } = await service.issue('GADDR');

    expect(nonce).toHaveLength(43); // 32 random bytes, base64url
    expect(expiresInSeconds).toBe(120);
    expect(redis.set).toHaveBeenCalledWith('auth:challenge:login:GADDR', nonce, 'EX', 120);
  });

  it('consume returns the nonce once and then null (one-time use)', async () => {
    const redis = makeRedisMock();
    const configService = { get: () => 300 } as any;
    const service = new ChallengeStoreService(redis as any, configService);

    const { nonce } = await service.issue('GADDR');
    expect(await service.consume('GADDR')).toBe(nonce);
    expect(await service.consume('GADDR')).toBeNull();
  });

  it('issuing a new challenge invalidates the previous one', async () => {
    const redis = makeRedisMock();
    const configService = { get: () => 300 } as any;
    const service = new ChallengeStoreService(redis as any, configService);

    const first = await service.issue('GADDR');
    const second = await service.issue('GADDR');

    expect(first.nonce).not.toBe(second.nonce);
    expect(await service.peek('GADDR')).toBe(second.nonce);
  });

  it('keeps login and link-wallet challenges in separate namespaces', async () => {
    const redis = makeRedisMock();
    const configService = { get: () => 300 } as any;
    const service = new ChallengeStoreService(redis as any, configService);

    const login = await service.issue('GADDR', 'login');
    const link = await service.issue('GADDR', 'link-wallet');

    expect(login.nonce).not.toBe(link.nonce);
    expect(await service.consume('GADDR', 'login')).toBe(login.nonce);
    // Consuming the login challenge must not affect the still-pending link-wallet one.
    expect(await service.peek('GADDR', 'link-wallet')).toBe(link.nonce);
  });
});
