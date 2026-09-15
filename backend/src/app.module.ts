import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StellarModule } from './stellar/stellar.module';
import { ContractsModule } from './contracts/contracts.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    StellarModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ContractsModule,
    AdminModule,
  ],
})
export class AppModule {}
