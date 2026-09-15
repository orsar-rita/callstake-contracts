import { ApiProperty } from '@nestjs/swagger';
import { IsBase64, IsNotEmpty } from 'class-validator';
import { IsStellarAddress } from '../../common/validators/is-stellar-address.validator';

export class VerifyChallengeDto {
  @ApiProperty({ example: 'GABCD...' })
  @IsStellarAddress()
  walletAddress!: string;

  @ApiProperty({ description: 'Base64-encoded ed25519 signature of the issued challenge nonce' })
  @IsNotEmpty()
  @IsBase64()
  signature!: string;
}
