import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractRegistryService } from '../config/contract-registry.service';
import { SorobanClientService } from '../stellar/soroban-client.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IndexedEvent } from './entities/indexed-event.entity';
import { IndexerCursor } from './entities/indexer-cursor.entity';

/**
 * Syncs a watched contract's on-chain events into Postgres so reads don't
 * have to hit Soroban RPC's getEvents on every request. Covers whichever
 * slots ContractRegistryService can resolve to a live address today — since
 * every slot in this repo's registry currently has address: null, indexing
 * a slot is a no-op (logged once, not treated as an error) until something
 * is actually deployed. The per-event decoding/storage/cursor-advance logic
 * itself is real and unit tested against a mocked SorobanClientService.
 */
@Injectable()
export class EventIndexerService {
  private readonly logger = new Logger(EventIndexerService.name);
  private readonly warnedUndeployed = new Set<string>();

  constructor(
    private readonly soroban: SorobanClientService,
    private readonly registry: ContractRegistryService,
    private readonly notifications: NotificationsService,
    @InjectRepository(IndexedEvent) private readonly events: Repository<IndexedEvent>,
    @InjectRepository(IndexerCursor) private readonly cursors: Repository<IndexerCursor>,
  ) {}

  async indexSlot(slot: string): Promise<number> {
    const resolved = this.registry.resolve(slot);
    if (!resolved.address) {
      if (!this.warnedUndeployed.has(slot)) {
        this.logger.warn(`Skipping indexing for "${slot}" — no deployed address yet`);
        this.warnedUndeployed.add(slot);
      }
      return 0;
    }

    const cursor = await this.cursors.findOne({ where: { contractSlot: slot } });
    const startLedger = cursor ? Number(cursor.lastLedger) + 1 : 0;

    const { events, latestLedger } = await this.soroban.getEvents(resolved.address, startLedger);

    for (const event of events) {
      await this.events.save(
        this.events.create({
          contractSlot: slot,
          ledger: String(event.ledger),
          txHash: event.txHash ?? null,
          topics: event.topics,
          data: event.data,
        }),
      );
      this.notifications.publish(slot, 'ContractEvent', event.data);
    }

    await this.cursors.save(
      this.cursors.create({ contractSlot: slot, lastLedger: String(latestLedger) }),
    );

    return events.length;
  }
}
