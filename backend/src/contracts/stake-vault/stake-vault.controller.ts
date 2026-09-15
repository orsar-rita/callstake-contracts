import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StakeVaultService } from './stake-vault.service';
import { DepositStakeDto, StakerAddressDto } from './dto/deposit-stake.dto';
import { SubmitTransactionDto } from '../../common/dto/submit-transaction.dto';

@ApiTags('stake-vault')
@Controller('contracts/stake-vault')
export class StakeVaultController {
  constructor(private readonly service: StakeVaultService) {}

  @Get('stakers/:address')
  getStake(@Param('address') address: string) {
    return this.service.getStake(address);
  }

  @Get('stakers/:address/voting-power')
  getVotingPower(@Param('address') address: string) {
    return this.service.getVotingPower(address);
  }

  @Get('stakers/:address/withdrawal-unlock-time')
  getWithdrawalUnlockTime(@Param('address') address: string) {
    return this.service.getWithdrawalUnlockTime(address);
  }

  @Get('minimum-stake')
  getMinimumStake() {
    return this.service.getMinimumStake();
  }

  @Get('paused')
  isPaused() {
    return this.service.isPaused();
  }

  @Post('deposit')
  buildDeposit(@Body() dto: DepositStakeDto) {
    return this.service.buildDepositStake(dto.staker, BigInt(dto.amount));
  }

  @Post('withdrawals/request')
  buildRequestWithdrawal(@Body() dto: StakerAddressDto) {
    return this.service.buildRequestWithdrawal(dto.staker);
  }

  @Post('withdrawals/finalize')
  buildWithdraw(@Body() dto: StakerAddressDto) {
    return this.service.buildWithdrawStake(dto.staker);
  }

  @Post('submit')
  submit(@Body() dto: SubmitTransactionDto) {
    return this.service.submitSignedTransaction(dto.signedXdr);
  }
}
