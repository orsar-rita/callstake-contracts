import { GovernanceService } from './governance.service';

function makeService() {
  const soroban = {
    callReadOnly: jest.fn().mockResolvedValue({ value: [], latestLedger: 1 }),
    buildInvocation: jest.fn().mockResolvedValue({ xdr: 'AAAA', latestLedger: 1 }),
    buildInvocationWithSpec: jest.fn().mockResolvedValue({ xdr: 'AAAA', latestLedger: 1 }),
    submitSignedTransaction: jest.fn(),
  };
  const registry = { requireAddress: jest.fn(() => 'CGOVERNANCE') };
  const configService = { get: jest.fn(() => 'GSIMULATIONACCOUNT') };
  return {
    service: new GovernanceService(soroban as any, registry as any, configService as any),
    soroban,
  };
}

describe('GovernanceService', () => {
  it('listProposals calls the contract with no arguments', async () => {
    const { service, soroban } = makeService();
    await service.listProposals();
    expect(soroban.callReadOnly).toHaveBeenCalledWith(
      'CGOVERNANCE',
      'proposals',
      [],
      'GSIMULATIONACCOUNT',
    );
  });

  it('buildCastVote is signed by the voter, not the backend, and wraps vote_type as a union tag', async () => {
    const { service, soroban } = makeService();
    await service.buildCastVote(7, 'GVOTER', 'For');
    expect(soroban.buildInvocationWithSpec).toHaveBeenCalledWith(
      'governance',
      'CGOVERNANCE',
      'cast_vote',
      { proposal_id: 7, voter: 'GVOTER', vote_type: { tag: 'For' } },
      'GVOTER',
    );
  });

  it('buildCreateProposal forwards the payload and wraps proposal_type/category as union tags', async () => {
    const { service, soroban } = makeService();
    const payload = Buffer.from('payload');
    await service.buildCreateProposal({
      proposer: 'GPROPOSER',
      proposalType: 'TreasurySpend',
      proposalTypeValues: ['GRECIPIENT', 1_000_000n, { code: 'XLM' }, 'grant payout'],
      title: 'Fund grants',
      description: 'desc',
      executionPayload: payload,
      category: 'TreasuryTransfer',
      useQuadraticVoting: false,
    });
    expect(soroban.buildInvocationWithSpec).toHaveBeenCalledWith(
      'governance',
      'CGOVERNANCE',
      'create_proposal',
      {
        proposer: 'GPROPOSER',
        proposal_type: {
          tag: 'TreasurySpend',
          values: ['GRECIPIENT', 1_000_000n, { code: 'XLM' }, 'grant payout'],
        },
        title: 'Fund grants',
        description: 'desc',
        execution_payload: payload,
        category: { tag: 'TreasuryTransfer' },
        use_quadratic_voting: false,
      },
      'GPROPOSER',
    );
  });
});
