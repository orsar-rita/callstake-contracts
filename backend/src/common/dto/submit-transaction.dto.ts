import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitTransactionDto {
  @ApiProperty({ description: 'Base64-encoded, fully-signed transaction envelope XDR' })
  @IsNotEmpty()
  @IsString()
  signedXdr!: string;
}
