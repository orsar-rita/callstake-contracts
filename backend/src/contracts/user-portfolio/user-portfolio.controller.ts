import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserPortfolioService } from './user-portfolio.service';

@ApiTags('user-portfolio')
@Controller('contracts/user-portfolio')
export class UserPortfolioController {
  constructor(private readonly service: UserPortfolioService) {}

  @Get('users/:address')
  getPortfolio(@Param('address') address: string, @Query('includeClosed') includeClosed?: string) {
    return this.service.getPortfolio(address, includeClosed === 'true');
  }

  @Get('users/:address/pnl')
  getPnl(@Param('address') address: string) {
    return this.service.getPnl(address);
  }

  @Get('users/:address/kyc-status')
  async getKycStatus(@Param('address') address: string) {
    const [required, verified] = await Promise.all([
      this.service.isKycRequired(),
      this.service.isKycVerified(address),
    ]);
    return { required, verified, tradingAllowed: !required || verified };
  }
}
