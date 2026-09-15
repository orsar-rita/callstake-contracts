import { Module } from '@nestjs/common';
import { SignalRegistryModule } from './signal-registry/signal-registry.module';
import { StakeVaultModule } from './stake-vault/stake-vault.module';

@Module({
  imports: [SignalRegistryModule, StakeVaultModule],
  exports: [SignalRegistryModule, StakeVaultModule],
})
export class ContractsModule {}
