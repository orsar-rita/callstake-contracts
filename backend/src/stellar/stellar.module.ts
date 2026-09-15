import { Global, Module } from '@nestjs/common';
import { SorobanClientService } from './soroban-client.service';

@Global()
@Module({
  providers: [SorobanClientService],
  exports: [SorobanClientService],
})
export class StellarModule {}
