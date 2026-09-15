import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OracleService } from './oracle.service';
import {
  AssetPairQueryDto,
  ConvertToBaseDto,
  HistoricalPriceQueryDto,
} from './dto/oracle-query.dto';

/**
 * Asset/AssetPair are structured on-chain types (see
 * call-stake/contracts/oracle/src/types.rs); this module accepts them as a
 * validated-but-not-fully-modeled shape (see dto/oracle-query.dto.ts) —
 * see OracleService's doc comment on why writes are out of scope
 * entirely, keeping this module deliberately narrow. POST is used even
 * for these reads because the lookup key is a structured object, not
 * something that fits a path/query param cleanly.
 */
@ApiTags('oracle')
@Controller('contracts/oracle')
export class OracleController {
  constructor(private readonly service: OracleService) {}

  @Post('convert-to-base')
  convertToBase(@Body() dto: ConvertToBaseDto) {
    return this.service.convertToBase(BigInt(dto.amount), dto.asset);
  }

  @Post('base-currency')
  getBaseCurrency() {
    return this.service.getBaseCurrency();
  }

  @Post('heartbeat')
  checkHeartbeat(@Body() dto: AssetPairQueryDto) {
    return this.service.checkOracleHeartbeat(dto.pair);
  }

  @Post('historical-price')
  getHistoricalPrice(@Body() dto: HistoricalPriceQueryDto) {
    return this.service.getHistoricalPrice(dto.pair, dto.timestamp);
  }

  @Post('deviation-breaker-status')
  isDeviationBreakerTripped(@Body() dto: AssetPairQueryDto) {
    return this.service.isUpdateDeviationBreakerTripped(dto.pair);
  }
}
