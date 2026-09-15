import { Module } from '@nestjs/common';
import { SignalRegistryModule } from './signal-registry/signal-registry.module';
import { StakeVaultModule } from './stake-vault/stake-vault.module';
import { FeeCollectorModule } from './fee-collector/fee-collector.module';
import { GovernanceModule } from './governance/governance.module';
import { OracleModule } from './oracle/oracle.module';
import { UserPortfolioModule } from './user-portfolio/user-portfolio.module';

@Module({
  imports: [
    SignalRegistryModule,
    StakeVaultModule,
    FeeCollectorModule,
    GovernanceModule,
    OracleModule,
    UserPortfolioModule,
  ],
  exports: [
    SignalRegistryModule,
    StakeVaultModule,
    FeeCollectorModule,
    GovernanceModule,
    OracleModule,
    UserPortfolioModule,
  ],
})
export class ContractsModule {}
