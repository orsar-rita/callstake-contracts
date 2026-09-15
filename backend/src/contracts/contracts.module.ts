import { Module } from '@nestjs/common';
import { SignalRegistryModule } from './signal-registry/signal-registry.module';
import { StakeVaultModule } from './stake-vault/stake-vault.module';
import { FeeCollectorModule } from './fee-collector/fee-collector.module';

@Module({
  imports: [SignalRegistryModule, StakeVaultModule, FeeCollectorModule],
  exports: [SignalRegistryModule, StakeVaultModule, FeeCollectorModule],
})
export class ContractsModule {}
