import { ApiProperty } from '@nestjs/swagger';
import { IsBase64, IsBoolean, IsString, MaxLength } from 'class-validator';
import { IsStellarAddress } from '../../../common/validators/is-stellar-address.validator';

export class CreateProposalDto {
  @ApiProperty({ example: 'GABCD...' })
  @IsStellarAddress()
  proposer!: string;

  @ApiProperty({ description: 'On-chain ProposalType enum variant name' })
  @IsString()
  proposalType!: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ description: 'Base64-encoded execution payload bytes' })
  @IsBase64()
  executionPayload!: string;

  @ApiProperty({ description: 'On-chain ProposalCategory enum variant name' })
  @IsString()
  category!: string;

  @ApiProperty()
  @IsBoolean()
  useQuadraticVoting!: boolean;
}

export class CastVoteDto {
  @ApiProperty()
  proposalId!: number;

  @ApiProperty({ example: 'GABCD...' })
  @IsStellarAddress()
  voter!: string;

  @ApiProperty({ description: 'On-chain GovernanceVoteType enum variant: For / Against / Abstain' })
  @IsString()
  voteType!: string;
}

export interface CreateProposalInput {
  proposer: string;
  proposalType: string;
  title: string;
  description: string;
  executionPayload: Buffer;
  category: string;
  useQuadraticVoting: boolean;
}
