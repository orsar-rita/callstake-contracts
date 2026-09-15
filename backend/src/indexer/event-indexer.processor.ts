import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { CONTRACT_SLOTS } from '../contracts/contracts.constants';
import { EventIndexerService } from './event-indexer.service';

export const INDEXER_QUEUE = 'event-indexer';

const WATCHED_SLOTS = Object.values(CONTRACT_SLOTS);

@Processor(INDEXER_QUEUE)
export class EventIndexerProcessor extends WorkerHost {
  private readonly logger = new Logger(EventIndexerProcessor.name);

  constructor(private readonly indexer: EventIndexerService) {
    super();
  }

  async process(): Promise<void> {
    for (const slot of WATCHED_SLOTS) {
      try {
        const count = await this.indexer.indexSlot(slot);
        if (count > 0) {
          this.logger.log(`Indexed ${count} new event(s) for "${slot}"`);
        }
      } catch (error) {
        this.logger.warn(`Indexing failed for "${slot}": ${(error as Error).message}`);
      }
    }
  }
}
