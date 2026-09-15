import { LeaderboardRefreshProcessor } from './leaderboard-refresh.processor';

describe('LeaderboardRefreshProcessor', () => {
  it('reads the leaderboard and publishes it as a notification', async () => {
    const signalRegistry = { getTopProviders: jest.fn().mockResolvedValue([{ provider: 'GA' }]) };
    const notifications = { publish: jest.fn() };
    const processor = new LeaderboardRefreshProcessor(signalRegistry as any, notifications as any);

    await processor.process({ data: { limit: 5 } } as any);

    expect(signalRegistry.getTopProviders).toHaveBeenCalledWith(5);
    expect(notifications.publish).toHaveBeenCalledWith('signal_registry', 'LeaderboardRefreshed', [
      { provider: 'GA' },
    ]);
  });

  it('defaults to a limit of 10 when the job has no data', async () => {
    const signalRegistry = { getTopProviders: jest.fn().mockResolvedValue([]) };
    const notifications = { publish: jest.fn() };
    const processor = new LeaderboardRefreshProcessor(signalRegistry as any, notifications as any);

    await processor.process({ data: {} } as any);

    expect(signalRegistry.getTopProviders).toHaveBeenCalledWith(10);
  });

  it('rethrows so BullMQ marks the job failed (and can retry it)', async () => {
    const signalRegistry = { getTopProviders: jest.fn().mockRejectedValue(new Error('rpc down')) };
    const notifications = { publish: jest.fn() };
    const processor = new LeaderboardRefreshProcessor(signalRegistry as any, notifications as any);

    await expect(processor.process({ data: {} } as any)).rejects.toThrow('rpc down');
    expect(notifications.publish).not.toHaveBeenCalled();
  });
});
