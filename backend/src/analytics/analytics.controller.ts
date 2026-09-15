import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('protocol-stats')
  getProtocolStats(@Query('tokens') tokens?: string) {
    const trackedTokens = tokens ? tokens.split(',').filter(Boolean) : [];
    return this.service.getProtocolStats(trackedTokens);
  }
}
