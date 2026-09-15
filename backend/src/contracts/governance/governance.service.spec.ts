import { GovernanceService } from './governance.service';

function makeService() {
  const soroban = {
    callReadOnly: jest.fn().mockResolvedValue({ value: [], latestLedger: 1 }),
    buildInvocation: jest.fn().mockResolvedValue({ xdr: 'AAAA', latestLedger: 1 }),
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

  it('buildCastVote is signed by the voter, not the backend', async () => {
    const { service, soroban } = makeService();
    await service.buildCastVote(7, 'GVOTER', 'For');
    expect(soroban.buildInvocation).toHaveBeenCalledWith(
      'CGOVERNANCE',
      'cast_vote',
      [7, 'GVOTER', 'For'],
      'GVOTER',
    );
  });

  it('buildCreateProposal forwards the decoded execution payload bytes', async () => {
    const { service, soroban } = makeService();
    const payload = Buffer.from('payload');
    await service.buildCreateProposal({
      proposer: 'GPROPOSER',
      proposalType: 'TreasurySpend',
      title: 'Fund grants',
      description: 'desc',
      executionPayload: payload,
      category: 'Treasury',
      useQuadraticVoting: false,
    });
    expect(soroban.buildInvocation).toHaveBeenCalledWith(
      'CGOVERNANCE',
      'create_proposal',
      ['GPROPOSER', 'TreasurySpend', 'Fund grants', 'desc', payload, 'Treasury', false],
      'GPROPOSER',
    );
  });
});
