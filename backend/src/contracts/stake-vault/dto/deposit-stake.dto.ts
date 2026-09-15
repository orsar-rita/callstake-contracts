import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';
import { IsStellarAddress } from '../../../common/validators/is-stellar-address.validator';

export class DepositStakeDto {
  @ApiProperty({ example: 'GABCD...' })
  @IsStellarAddress()
  staker!: string;

  @ApiProperty({ description: 'Amount as a stringified i128, in the stake token\'s smallest unit' })
  @IsNumberString()
  amount!: string;
}

export class StakerAddressDto {
  @ApiProperty({ example: 'GABCD...' })
  @IsStellarAddress()
  staker!: string;
}
