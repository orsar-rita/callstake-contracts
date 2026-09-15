import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { IndexedEvent } from './entities/indexed-event.entity';
import { IndexerCursor } from './entities/indexer-cursor.entity';
import { EventIndexerService } from './event-indexer.service';
import { EventIndexerProcessor, INDEXER_QUEUE } from './event-indexer.processor';
import { IndexerSchedulerService } from './indexer-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([IndexedEvent, IndexerCursor]),
    BullModule.registerQueue({ name: INDEXER_QUEUE }),
    NotificationsModule,
  ],
  providers: [EventIndexerService, EventIndexerProcessor, IndexerSchedulerService],
  exports: [EventIndexerService],
})
export class IndexerModule {}
