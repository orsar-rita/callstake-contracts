import { ApiProperty } from '@nestjs/swagger';
import { IsStellarAddress } from '../../../common/validators/is-stellar-address.validator';
import { IsContractAddress } from '../../../common/validators/is-contract-address.validator';

export class ClaimFeesDto {
  @ApiProperty({ example: 'GABCD...' })
  @IsStellarAddress()
  provider!: string;

  @ApiProperty({ example: 'CTOKEN...', description: 'Asset contract address' })
  @IsContractAddress()
  token!: string;
}
