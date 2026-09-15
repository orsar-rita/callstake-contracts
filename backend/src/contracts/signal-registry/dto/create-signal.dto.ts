import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt, IsNumberString, IsString, MaxLength } from 'class-validator';
import { IsStellarAddress } from '../../../common/validators/is-stellar-address.validator';

export class CreateSignalDto {
  @ApiProperty({ example: 'GABCD...' })
  @IsStellarAddress()
  provider!: string;

  @ApiProperty({ example: 'XLM/USDC' })
  @IsString()
  @MaxLength(32)
  assetPair!: string;

  @ApiProperty({ description: 'On-chain SignalAction enum variant name, e.g. "Buy" / "Sell"' })
  @IsString()
  action!: string;

  @ApiProperty({ description: 'Price as a stringified i128 (stroops-equivalent scale used by the contract)' })
  @IsNumberString()
  price!: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  rationale!: string;

  @ApiProperty({ description: 'Unix timestamp the signal expires at' })
  @IsInt()
  expiry!: number;

  @ApiProperty({ description: 'On-chain SignalCategory enum variant name' })
  @IsString()
  category!: string;

  @ApiProperty({ type: [String], maxItems: 8 })
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  tags!: string[];

  @ApiProperty({ description: 'On-chain RiskLevel enum variant name' })
  @IsString()
  riskLevel!: string;
}

export interface CreateSignalInput {
  provider: string;
  assetPair: string;
  action: string;
  price: bigint;
  rationale: string;
  expiry: number;
  category: string;
  tags: string[];
  riskLevel: string;
}
