import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OracleService } from './oracle.service';

/**
 * Asset/AssetPair are structured on-chain types (see
 * call-stake/contracts/oracle/src/types.rs); this module accepts them as
 * opaque JSON bodies rather than a modeled DTO — see OracleService's doc
 * comment on why writes are out of scope entirely, keeping this module
 * deliberately narrow. POST is used even for these reads because the
 * lookup key is a structured object, not something that fits a path/query
 * param cleanly.
 */
@ApiTags('oracle')
@Controller('contracts/oracle')
export class OracleController {
  constructor(private readonly service: OracleService) {}

  @Post('convert-to-base')
  convertToBase(@Body() body: { amount: string; asset: unknown }) {
    return this.service.convertToBase(BigInt(body.amount), body.asset);
  }

  @Post('base-currency')
  getBaseCurrency() {
    return this.service.getBaseCurrency();
  }

  @Post('heartbeat')
  checkHeartbeat(@Body() body: { pair: unknown }) {
    return this.service.checkOracleHeartbeat(body.pair);
  }

  @Post('historical-price')
  getHistoricalPrice(@Body() body: { pair: unknown; timestamp: number }) {
    return this.service.getHistoricalPrice(body.pair, body.timestamp);
  }

  @Post('deviation-breaker-status')
  isDeviationBreakerTripped(@Body() body: { pair: unknown }) {
    return this.service.isUpdateDeviationBreakerTripped(body.pair);
  }
}
