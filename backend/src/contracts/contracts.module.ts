import { Module } from '@nestjs/common';
import { SignalRegistryModule } from './signal-registry/signal-registry.module';

@Module({
  imports: [SignalRegistryModule],
  exports: [SignalRegistryModule],
})
export class ContractsModule {}
