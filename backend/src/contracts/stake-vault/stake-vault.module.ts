import { Module } from '@nestjs/common';
import { StakeVaultController } from './stake-vault.controller';
import { StakeVaultService } from './stake-vault.service';

@Module({
  controllers: [StakeVaultController],
  providers: [StakeVaultService],
  exports: [StakeVaultService],
})
export class StakeVaultModule {}
