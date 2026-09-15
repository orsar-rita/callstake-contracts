import { EventIndexerService } from './event-indexer.service';

function makeService() {
  const soroban = { getEvents: jest.fn() };
  const registry = { resolve: jest.fn() };
  const notifications = { publish: jest.fn() };
  const eventsRepo = {
    save: jest.fn().mockImplementation(async (e) => e),
    create: jest.fn((d) => d),
  };
  const cursorsRepo = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation(async (c) => c),
    create: jest.fn((d) => d),
  };
  const service = new EventIndexerService(
    soroban as any,
    registry as any,
    notifications as any,
    eventsRepo as any,
    cursorsRepo as any,
  );
  return { service, soroban, registry, notifications, eventsRepo, cursorsRepo };
}

describe('EventIndexerService', () => {
  it('skips indexing (returns 0) when the slot has no deployed address', async () => {
    const { service, registry, soroban } = makeService();
    registry.resolve.mockReturnValue({ address: null });

    const count = await service.indexSlot('oracle');

    expect(count).toBe(0);
    expect(soroban.getEvents).not.toHaveBeenCalled();
  });

  it('starts from ledger 0 with no prior cursor and saves each event plus the new cursor', async () => {
    const { service, registry, soroban, cursorsRepo, eventsRepo, notifications } = makeService();
    registry.resolve.mockReturnValue({ address: 'CADDR' });
    cursorsRepo.findOne.mockResolvedValue(null);
    soroban.getEvents.mockResolvedValue({
      latestLedger: 500,
      events: [{ ledger: 100, txHash: 'tx1', topics: ['SignalCreated'], data: { signalId: 1 } }],
    });

    const count = await service.indexSlot('signal_registry');

    expect(soroban.getEvents).toHaveBeenCalledWith('CADDR', 0);
    expect(count).toBe(1);
    expect(eventsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ contractSlot: 'signal_registry', ledger: '100', txHash: 'tx1' }),
    );
    expect(cursorsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ contractSlot: 'signal_registry', lastLedger: '500' }),
    );
    expect(notifications.publish).toHaveBeenCalledWith('signal_registry', 'ContractEvent', {
      signalId: 1,
    });
  });

  it('resumes from cursor.lastLedger + 1 on a subsequent run', async () => {
    const { service, registry, soroban, cursorsRepo } = makeService();
    registry.resolve.mockReturnValue({ address: 'CADDR' });
    cursorsRepo.findOne.mockResolvedValue({ contractSlot: 'signal_registry', lastLedger: '500' });
    soroban.getEvents.mockResolvedValue({ latestLedger: 500, events: [] });

    await service.indexSlot('signal_registry');

    expect(soroban.getEvents).toHaveBeenCalledWith('CADDR', 501);
  });
});
