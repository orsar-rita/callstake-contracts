import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GovernanceService } from './governance.service';
import { CastVoteDto, CreateProposalDto } from './dto/create-proposal.dto';
import { SubmitTransactionDto } from '../../common/dto/submit-transaction.dto';

@ApiTags('governance')
@Controller('contracts/governance')
export class GovernanceController {
  constructor(private readonly service: GovernanceService) {}

  @Get('proposals')
  listProposals() {
    return this.service.listProposals();
  }

  @Get('proposals/:id')
  getProposal(@Param('id', ParseIntPipe) id: number) {
    return this.service.getProposal(id);
  }

  @Get('holders/:address/voting-power')
  getVotingPower(@Param('address') address: string) {
    return this.service.getVotingPower(address);
  }

  @Get('config')
  getGovernanceConfig() {
    return this.service.getGovernanceConfig();
  }

  @Post('proposals')
  buildCreateProposal(@Body() dto: CreateProposalDto) {
    return this.service.buildCreateProposal({
      ...dto,
      executionPayload: Buffer.from(dto.executionPayload, 'base64'),
    });
  }

  @Post('votes')
  buildCastVote(@Body() dto: CastVoteDto) {
    return this.service.buildCastVote(dto.proposalId, dto.voter, dto.voteType);
  }

  @Post('submit')
  submit(@Body() dto: SubmitTransactionDto) {
    return this.service.submitSignedTransaction(dto.signedXdr);
  }
}
