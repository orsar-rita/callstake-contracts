import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { LEADERBOARD_QUEUE } from './jobs/leaderboard-refresh.processor';

const LEADERBOARD_REFRESH_INTERVAL_MS = 60_000;

@Injectable()
export class QueueSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(QueueSchedulerService.name);

  constructor(@InjectQueue(LEADERBOARD_QUEUE) private readonly leaderboardQueue: Queue) {}

  async onModuleInit() {
    await this.leaderboardQueue.upsertJobScheduler(
      'leaderboard-refresh-repeat',
      { every: LEADERBOARD_REFRESH_INTERVAL_MS },
      { data: { limit: 10 } },
    );
    this.logger.log(`Scheduled leaderboard refresh every ${LEADERBOARD_REFRESH_INTERVAL_MS}ms`);
  }
}
