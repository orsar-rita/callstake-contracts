import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { INDEXER_QUEUE } from './event-indexer.processor';

const INDEXER_INTERVAL_MS = 30_000;

@Injectable()
export class IndexerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(IndexerSchedulerService.name);

  constructor(@InjectQueue(INDEXER_QUEUE) private readonly indexerQueue: Queue) {}

  async onModuleInit() {
    await this.indexerQueue.upsertJobScheduler('event-indexer-repeat', {
      every: INDEXER_INTERVAL_MS,
    });
    this.logger.log(`Scheduled event indexing every ${INDEXER_INTERVAL_MS}ms`);
  }
}
