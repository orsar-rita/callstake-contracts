import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBase64, IsBoolean, IsString, MaxLength } from 'class-validator';
import { IsStellarAddress } from '../../../common/validators/is-stellar-address.validator';

export class CreateProposalDto {
  @ApiProperty({ example: 'GABCD...' })
  @IsStellarAddress()
  proposer!: string;

  @ApiProperty({ description: 'On-chain ProposalType enum variant name, e.g. "SignalProposal"' })
  @IsString()
  proposalType!: string;

  @ApiProperty({
    description:
      'Positional values for the ProposalType variant named in proposalType, in the order ' +
      'call-stake/contracts/governance/src/proposals.rs declares them (e.g. ParameterChange ' +
      'takes [key: string, minValue: string, maxValue: string]; SignalProposal takes ' +
      '[description: string]). Every ProposalType variant carries at least one value, so this ' +
      'is required. Encoded via the contract\'s real compiled spec — a wrong count or type for ' +
      'the chosen variant fails the request instead of submitting malformed XDR.',
  })
  @IsArray()
  proposalTypeValues!: unknown[];

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
  proposalTypeValues: unknown[];
  title: string;
  description: string;
  executionPayload: Buffer;
  category: string;
  useQuadraticVoting: boolean;
}
