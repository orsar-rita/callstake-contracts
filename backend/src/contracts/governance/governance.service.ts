import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContractRegistryService } from '../../config/contract-registry.service';
import { SorobanClientService } from '../../stellar/soroban-client.service';
import { requireSimulationAccount } from '../../stellar/simulation-account';
import { CONTRACT_SLOTS } from '../contracts.constants';
import { CreateProposalInput } from './dto/create-proposal.dto';

@Injectable()
export class GovernanceService {
  constructor(
    private readonly soroban: SorobanClientService,
    private readonly registry: ContractRegistryService,
    private readonly configService: ConfigService,
  ) {}

  private address(): string {
    return this.registry.requireAddress(CONTRACT_SLOTS.GOVERNANCE);
  }

  private simAccount(): string {
    return requireSimulationAccount(this.configService);
  }

  async getProposal(proposalId: number) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'proposal',
      [proposalId],
      this.simAccount(),
    );
    return result.value;
  }

  async listProposals() {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'proposals',
      [],
      this.simAccount(),
    );
    return result.value;
  }

  async getVotingPower(holder: string) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'voting_power',
      [holder],
      this.simAccount(),
    );
    return result.value;
  }

  async getGovernanceConfig() {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'governance_config',
      [],
      this.simAccount(),
    );
    return result.value;
  }

  /**
   * proposal_type is ProposalType (call-stake/contracts/governance/src/proposals.rs)
   * — a tuple-variant union, so it needs both a variant name and its
   * positional associated values (e.g. SignalProposal(String) needs one
   * value, ParameterChange(String, i128, i128) needs three). category is
   * ProposalCategory, a unit-variant union (name only). Both are encoded
   * via buildInvocationWithSpec against the contract's real compiled spec,
   * which also validates each variant's arity/types at encode time instead
   * of silently producing malformed XDR the way generic nativeToScVal did
   * (see docs/CONTRACT_BUILD_DIAGNOSIS.md).
   */
  async buildCreateProposal(input: CreateProposalInput) {
    return this.soroban.buildInvocationWithSpec(
      'governance',
      this.address(),
      'create_proposal',
      {
        proposer: input.proposer,
        proposal_type: { tag: input.proposalType, values: input.proposalTypeValues },
        title: input.title,
        description: input.description,
        execution_payload: input.executionPayload,
        category: { tag: input.category },
        use_quadratic_voting: input.useQuadraticVoting,
      },
      input.proposer,
    );
  }

  /** vote_type is GovernanceVoteType, a unit-variant union (For/Against/Abstain). */
  async buildCastVote(proposalId: number, voter: string, voteType: string) {
    return this.soroban.buildInvocationWithSpec(
      'governance',
      this.address(),
      'cast_vote',
      {
        proposal_id: proposalId,
        voter,
        vote_type: { tag: voteType },
      },
      voter,
    );
  }

  async submitSignedTransaction(signedXdr: string) {
    return this.soroban.submitSignedTransaction(signedXdr);
  }
}
