import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ContractsModule } from '../contracts/contracts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LEADERBOARD_QUEUE, LeaderboardRefreshProcessor } from './jobs/leaderboard-refresh.processor';
import { QueueSchedulerService } from './queue-scheduler.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
        },
      }),
    }),
    BullModule.registerQueue({ name: LEADERBOARD_QUEUE }),
    ContractsModule,
    NotificationsModule,
  ],
  providers: [LeaderboardRefreshProcessor, QueueSchedulerService],
})
export class QueueModule {}
