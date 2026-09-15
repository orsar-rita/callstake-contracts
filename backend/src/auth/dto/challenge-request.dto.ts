import { ApiProperty } from '@nestjs/swagger';
import { IsStellarAddress } from '../../common/validators/is-stellar-address.validator';

export class ChallengeRequestDto {
  @ApiProperty({
    example: 'GABCD...',
    description: 'Stellar account address requesting a login challenge',
  })
  @IsStellarAddress()
  walletAddress!: string;
}
