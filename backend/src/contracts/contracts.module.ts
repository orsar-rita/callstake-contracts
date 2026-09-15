import { Module } from '@nestjs/common';
import { SignalRegistryModule } from './signal-registry/signal-registry.module';
import { StakeVaultModule } from './stake-vault/stake-vault.module';
import { FeeCollectorModule } from './fee-collector/fee-collector.module';
import { GovernanceModule } from './governance/governance.module';
import { OracleModule } from './oracle/oracle.module';

@Module({
  imports: [SignalRegistryModule, StakeVaultModule, FeeCollectorModule, GovernanceModule, OracleModule],
  exports: [SignalRegistryModule, StakeVaultModule, FeeCollectorModule, GovernanceModule, OracleModule],
})
export class ContractsModule {}
