import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';

/**
 * Redis-backed response cache for read-heavy, slow-changing endpoints
 * (leaderboard, protocol stats, portfolio reads) — wired per-endpoint with
 * @UseInterceptors(CacheInterceptor) + @CacheTTL(...), not applied
 * globally, since most of this API (auth, writes, admin) must never be
 * cached.
 */
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
        }),
        ttl: 30_000,
      }),
    }),
  ],
})
export class CacheConfigModule {}
