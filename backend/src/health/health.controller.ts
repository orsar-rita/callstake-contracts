import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

interface DependencyStatus {
  status: 'ok' | 'error';
  error?: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  async check() {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    const healthy = database.status === 'ok' && redis.status === 'ok';

    return {
      status: healthy ? 'ok' : 'degraded',
      service: 'callstake-backend',
      timestamp: new Date().toISOString(),
      dependencies: { database, redis },
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', error: (error as Error).message };
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      await this.redis.ping();
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', error: (error as Error).message };
    }
  }
}
