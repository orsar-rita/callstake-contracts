import { Module } from '@nestjs/common';
import { UserPortfolioController } from './user-portfolio.controller';
import { UserPortfolioService } from './user-portfolio.service';
import { KycGuard } from './kyc.guard';

@Module({
  controllers: [UserPortfolioController],
  providers: [UserPortfolioService, KycGuard],
  exports: [UserPortfolioService, KycGuard],
})
export class UserPortfolioModule {}
