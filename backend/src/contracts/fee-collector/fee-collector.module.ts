import { Module } from '@nestjs/common';
import { FeeCollectorController } from './fee-collector.controller';
import { FeeCollectorService } from './fee-collector.service';

@Module({
  controllers: [FeeCollectorController],
  providers: [FeeCollectorService],
  exports: [FeeCollectorService],
})
export class FeeCollectorModule {}
