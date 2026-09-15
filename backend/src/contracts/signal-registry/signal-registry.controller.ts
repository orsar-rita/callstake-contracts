import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags } from '@nestjs/swagger';
import { SignalRegistryService } from './signal-registry.service';
import { CreateSignalDto } from './dto/create-signal.dto';
import { SubmitTransactionDto } from '../../common/dto/submit-transaction.dto';

@ApiTags('signal-registry')
@Controller('contracts/signal-registry')
export class SignalRegistryController {
  constructor(private readonly service: SignalRegistryService) {}

  @Get('signals/:id')
  getSignal(@Param('id', ParseIntPipe) id: number) {
    return this.service.getSignal(id);
  }

  @Get('signals/:id/quality-score')
  getSignalQualityScore(@Param('id', ParseIntPipe) id: number) {
    return this.service.getSignalQualityScore(id);
  }

  @Get('providers/:address/reputation')
  getProviderReputationScore(@Param('address') address: string) {
    return this.service.getProviderReputationScore(address);
  }

  @Get('providers/:address/stats')
  getProviderStats(@Param('address') address: string) {
    return this.service.getProviderStats(address);
  }

  @Get('providers/:address/banned')
  isProviderBanned(@Param('address') address: string) {
    return this.service.isProviderBanned(address);
  }

  @Get('leaderboard/top-providers')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30_000)
  getTopProviders(@Query('limit', new ParseIntPipe({ optional: true })) limit = 10) {
    return this.service.getTopProviders(limit);
  }

  @Post('signals')
  buildCreateSignal(@Body() dto: CreateSignalDto) {
    return this.service.buildCreateSignal({ ...dto, price: BigInt(dto.price) });
  }

  @Post('submit')
  submit(@Body() dto: SubmitTransactionDto) {
    return this.service.submitSignedTransaction(dto.signedXdr);
  }
}
