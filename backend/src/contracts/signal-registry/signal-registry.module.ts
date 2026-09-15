import { Module } from '@nestjs/common';
import { SignalRegistryController } from './signal-registry.controller';
import { SignalRegistryService } from './signal-registry.service';

@Module({
  controllers: [SignalRegistryController],
  providers: [SignalRegistryService],
  exports: [SignalRegistryService],
})
export class SignalRegistryModule {}
