import { Account, Keypair, nativeToScVal, rpc, StrKey } from '@stellar/stellar-sdk';
import { SorobanClientService } from './soroban-client.service';
import { ContractRegistryService } from '../config/contract-registry.service';

jest.mock('@stellar/stellar-sdk', () => {
  const actual = jest.requireActual('@stellar/stellar-sdk');
  return {
    ...actual,
    rpc: {
      ...actual.rpc,
      Server: jest.fn(),
    },
  };
});

function makeRegistry() {
  return {
    getRpcConfig: () => ({
      primary_rpc: 'https://example-rpc.test',
      fallback_rpc: 'https://example-rpc-fallback.test',
      horizon_url: 'https://example-horizon.test',
      network_passphrase: 'Test SDF Network ; September 2015',
    }),
    getNetwork: () => 'testnet',
  } as unknown as ContractRegistryService;
}

describe('SorobanClientService', () => {
  const sourceKeypair = Keypair.random();
  const contractAddress = StrKey.encodeContract(Buffer.alloc(32, 1));

  function makeServiceWithFakeServer() {
    const fakeServer = {
      getAccount: jest.fn().mockResolvedValue(new Account(sourceKeypair.publicKey(), '100')),
      simulateTransaction: jest.fn(),
      prepareTransaction: jest.fn(),
      sendTransaction: jest.fn(),
      getLatestLedger: jest.fn().mockResolvedValue({ sequence: 555 }),
      getTransaction: jest.fn(),
    };
    (rpc.Server as unknown as jest.Mock).mockImplementation(() => fakeServer);
    const service = new SorobanClientService(makeRegistry());
    return { service, fakeServer };
  }

  it('callReadOnly returns the decoded native value from a successful simulation', async () => {
    const { service, fakeServer } = makeServiceWithFakeServer();
    fakeServer.simulateTransaction.mockResolvedValue({
      latestLedger: 100,
      result: { retval: nativeToScVal(42, { type: 'i128' }), auth: [] },
      transactionData: {},
      minResourceFee: '100',
      cost: {},
      events: [],
    });

    const result = await service.callReadOnly<bigint>(
      contractAddress,
      'get_min_stake',
      [],
      sourceKeypair.publicKey(),
    );

    expect(result.value).toBe(42n);
    expect(result.latestLedger).toBe(100);
  });

  it('callReadOnly throws with a descriptive message when simulation errors', async () => {
    const { service, fakeServer } = makeServiceWithFakeServer();
    fakeServer.simulateTransaction.mockResolvedValue({
      error: 'contract not found',
      latestLedger: 100,
      events: [],
    });

    await expect(
      service.callReadOnly(contractAddress, 'get_min_stake', [], sourceKeypair.publicKey()),
    ).rejects.toThrow(/Simulation failed/);
  });

  it('callReadOnly surfaces a clear error when the simulation account does not exist on-chain', async () => {
    const { service, fakeServer } = makeServiceWithFakeServer();
    fakeServer.getAccount.mockRejectedValue(new Error('Not Found'));

    await expect(
      service.callReadOnly(contractAddress, 'get_min_stake', [], 'GUNKNOWNACCOUNT'),
    ).rejects.toThrow(/could not load account/i);
  });

  it('submitSignedTransaction relays the hash and status from RPC', async () => {
    const { service, fakeServer } = makeServiceWithFakeServer();
    fakeServer.sendTransaction.mockResolvedValue({ hash: 'deadbeef', status: 'PENDING' });

    // A minimal, syntactically valid signed envelope is enough here — this
    // test verifies relaying behavior, not transaction construction.
    const { TransactionBuilder, Account: RealAccount, Operation } = jest.requireActual('@stellar/stellar-sdk');
    const account = new RealAccount(sourceKeypair.publicKey(), '100');
    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: 'Test SDF Network ; September 2015',
    })
      .addOperation(Operation.bumpSequence({ bumpTo: '101' }))
      .setTimeout(30)
      .build();
    tx.sign(sourceKeypair);

    const result = await service.submitSignedTransaction(tx.toXDR());

    expect(result).toEqual({ hash: 'deadbeef', status: 'PENDING' });
  });
});
