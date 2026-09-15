import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SignalRegistryService } from '../../contracts/signal-registry/signal-registry.service';
import { NotificationsService } from '../../notifications/notifications.service';

export const LEADERBOARD_QUEUE = 'leaderboard-refresh';

/**
 * Re-reads the top-providers leaderboard on a fixed interval (scheduled by
 * QueueSchedulerService) and publishes it as a notification, so an SSE
 * subscriber sees leaderboard movement without polling the read endpoint
 * themselves. Deliberately the one example job for now — see
 * docs/BACKEND_SCOPE.md: a full event indexer (watching every contract's
 * on-chain events) is separate, larger scope.
 */
@Processor(LEADERBOARD_QUEUE)
export class LeaderboardRefreshProcessor extends WorkerHost {
  private readonly logger = new Logger(LeaderboardRefreshProcessor.name);

  constructor(
    private readonly signalRegistry: SignalRegistryService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    try {
      const limit = (job.data?.limit as number) ?? 10;
      const leaderboard = await this.signalRegistry.getTopProviders(limit);
      this.notifications.publish('signal_registry', 'LeaderboardRefreshed', leaderboard);
    } catch (error) {
      this.logger.warn(`Leaderboard refresh job failed: ${(error as Error).message}`);
      throw error;
    }
  }
}
