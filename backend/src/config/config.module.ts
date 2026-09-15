import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { ContractRegistryService } from './contract-registry.service';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // configuration() already validates via zod and throws on failure,
      // so there is nothing further for @nestjs/config's own validate to do.
    }),
  ],
  providers: [ContractRegistryService],
  exports: [ContractRegistryService],
})
export class ConfigModule {}
