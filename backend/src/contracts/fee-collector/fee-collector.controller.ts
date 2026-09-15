import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FeeCollectorService } from './fee-collector.service';
import { ClaimFeesDto } from './dto/claim-fees.dto';
import { SubmitTransactionDto } from '../../common/dto/submit-transaction.dto';

@ApiTags('fee-collector')
@Controller('contracts/fee-collector')
export class FeeCollectorController {
  constructor(private readonly service: FeeCollectorService) {}

  @Get('users/:address/fee-rate')
  getFeeRateForUser(@Param('address') address: string) {
    return this.service.getFeeRateForUser(address);
  }

  @Get('users/:address/monthly-volume')
  getMonthlyTradeVolume(@Param('address') address: string) {
    return this.service.getMonthlyTradeVolume(address);
  }

  @Get('treasury/:token')
  getTreasuryBalance(@Param('token') token: string) {
    return this.service.getTreasuryBalance(token);
  }

  @Get('fee-rate')
  getFeeRate() {
    return this.service.getFeeRate();
  }

  @Get('fee-rate/dynamic')
  getDynamicFeeRate() {
    return this.service.getCurrentDynamicFeeRate();
  }

  @Post('claim')
  buildClaim(@Body() dto: ClaimFeesDto) {
    return this.service.buildClaimFees(dto.provider, dto.token);
  }

  @Post('submit')
  submit(@Body() dto: SubmitTransactionDto) {
    return this.service.submitSignedTransaction(dto.signedXdr);
  }
}
