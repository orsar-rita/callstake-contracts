import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumberString, IsObject } from 'class-validator';

// Asset/AssetPair are structured on-chain types (see
// call-stake/contracts/oracle/src/types.rs) accepted here as a validated
// "must be a plain object" shape rather than a fully modeled one — see
// OracleController's doc comment. IsObject at least gives the global
// ValidationPipe something real to enforce (reject a string/number/array
// body) instead of silently passing an unvalidated payload through, which
// a bare TS type annotation on @Body() cannot do at runtime.

export class ConvertToBaseDto {
  @ApiProperty()
  @IsNumberString()
  amount!: string;

  @ApiProperty({ description: 'Asset struct — see call-stake/contracts/oracle/src/types.rs' })
  @IsObject()
  asset!: Record<string, unknown>;
}

export class AssetPairQueryDto {
  @ApiProperty({ description: 'AssetPair struct — see call-stake/contracts/oracle/src/types.rs' })
  @IsObject()
  pair!: Record<string, unknown>;
}

export class HistoricalPriceQueryDto extends AssetPairQueryDto {
  @ApiProperty()
  @IsInt()
  timestamp!: number;
}
