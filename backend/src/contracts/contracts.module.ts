import { Module } from '@nestjs/common';
import { SignalRegistryModule } from './signal-registry/signal-registry.module';
import { StakeVaultModule } from './stake-vault/stake-vault.module';
import { FeeCollectorModule } from './fee-collector/fee-collector.module';
import { GovernanceModule } from './governance/governance.module';

@Module({
  imports: [SignalRegistryModule, StakeVaultModule, FeeCollectorModule, GovernanceModule],
  exports: [SignalRegistryModule, StakeVaultModule, FeeCollectorModule, GovernanceModule],
})
export class ContractsModule {}
