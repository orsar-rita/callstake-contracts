import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('protocol-stats')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30_000)
  getProtocolStats(@Query('tokens') tokens?: string) {
    const trackedTokens = tokens ? tokens.split(',').filter(Boolean) : [];
    return this.service.getProtocolStats(trackedTokens);
  }
}
