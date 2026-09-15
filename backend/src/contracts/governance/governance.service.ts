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
   * Same enum-encoding caveat as signal-registry's create_signal: proposal_type
   * and category are the contract's custom Soroban enums (ProposalType,
   * ProposalCategory in call-stake/contracts/governance/src/types.rs) and
   * are passed through generically — unverified against the exact on-chain
   * XDR encoding. See docs/BACKEND_SCOPE.md.
   */
  async buildCreateProposal(input: CreateProposalInput) {
    return this.soroban.buildInvocation(
      this.address(),
      'create_proposal',
      [
        input.proposer,
        input.proposalType,
        input.title,
        input.description,
        input.executionPayload,
        input.category,
        input.useQuadraticVoting,
      ],
      input.proposer,
    );
  }

  async buildCastVote(proposalId: number, voter: string, voteType: string) {
    return this.soroban.buildInvocation(
      this.address(),
      'cast_vote',
      [proposalId, voter, voteType],
      voter,
    );
  }

  async submitSignedTransaction(signedXdr: string) {
    return this.soroban.submitSignedTransaction(signedXdr);
  }
}
