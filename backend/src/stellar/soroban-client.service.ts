import { Injectable, Logger } from '@nestjs/common';
import {
  Account,
  Contract,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { ContractRegistryService } from '../config/contract-registry.service';
import { getContractSpec } from './contract-spec-registry';

export interface ReadResult<T> {
  value: T;
  latestLedger: number;
}

export interface BuiltInvocation {
  /** Unsigned transaction XDR — the caller (frontend, via Freighter) signs this, the backend never holds user keys. */
  xdr: string;
  latestLedger: number;
}

/**
 * Thin wrapper over @stellar/stellar-sdk's Soroban RPC client. Every
 * contract-integration module (signal registry, stake vault, ...) builds
 * on this rather than talking to `rpc.Server` directly, so the retry/
 * error-shape/argument-conversion behavior is defined once.
 *
 * The backend never signs or holds a private key for a user-owned account:
 * `buildInvocation` returns unsigned XDR for the client to sign with
 * Freighter (matching the frontend's existing @stellar/freighter-api
 * integration); `submitSignedTransaction` just relays an already-signed
 * envelope to RPC.
 */
@Injectable()
export class SorobanClientService {
  private readonly logger = new Logger(SorobanClientService.name);
  private server: rpc.Server;

  constructor(private readonly registry: ContractRegistryService) {
    const { primary_rpc: primaryRpc } = this.registry.getRpcConfig();
    this.server = new rpc.Server(primaryRpc);
  }

  /**
   * Read-only contract call via simulation — no transaction is submitted or
   * fee-charged. Requires a source account that exists on-chain purely to
   * build a well-formed envelope (Soroban's own requirement); it doesn't
   * need funds beyond existing, since nothing is ever signed or submitted.
   */
  async callReadOnly<T>(
    contractAddress: string,
    method: string,
    args: unknown[],
    simulationAccountId: string,
  ): Promise<ReadResult<T>> {
    const account = await this.loadAccountOrThrow(simulationAccountId);
    const contract = new Contract(contractAddress);
    const scArgs = args.map((arg) => this.toScVal(arg));

    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: this.registry.getRpcConfig().network_passphrase,
    })
      .addOperation(contract.call(method, ...scArgs))
      .setTimeout(30)
      .build();

    const simulated = await this.server.simulateTransaction(transaction);

    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed for ${contractAddress}.${method}: ${simulated.error}`);
    }
    if (!rpc.Api.isSimulationSuccess(simulated) || !simulated.result) {
      throw new Error(`Simulation for ${contractAddress}.${method} returned no result`);
    }

    return {
      value: scValToNative(simulated.result.retval) as T,
      latestLedger: simulated.latestLedger,
    };
  }

  /** Builds (but does not sign or submit) a transaction invoking a state-changing contract method. */
  async buildInvocation(
    contractAddress: string,
    method: string,
    args: unknown[],
    sourceAccountId: string,
  ): Promise<BuiltInvocation> {
    const account = await this.loadAccountOrThrow(sourceAccountId);
    const contract = new Contract(contractAddress);
    const scArgs = args.map((arg) => this.toScVal(arg));

    const transaction = new TransactionBuilder(account, {
      fee: '1000',
      networkPassphrase: this.registry.getRpcConfig().network_passphrase,
    })
      .addOperation(contract.call(method, ...scArgs))
      .setTimeout(60)
      .build();

    const prepared = await this.server.prepareTransaction(transaction);

    return { xdr: prepared.toXDR(), latestLedger: (await this.server.getLatestLedger()).sequence };
  }

  /**
   * Like `buildInvocation`, but for a method whose arguments include a
   * contract-defined Soroban enum/union (e.g. SignalAction, ProposalType) —
   * types the generic `nativeToScVal(value)` used by `buildInvocation`
   * cannot correctly represent from a bare JS value. `namedArgs` are encoded
   * via that contract's real compiled spec (see contract-spec-registry.ts),
   * so an enum argument's `{tag, values}` shape and every other parameter's
   * type come from the contract itself rather than a hand-maintained
   * assumption. `specPackageName` is the spec snapshot's file name under
   * src/contracts/specs/ (see generate-contract-specs.sh), which may differ
   * from the manifest's logical slot name if a slot's package name ever
   * legitimately differs from its logical name.
   */
  async buildInvocationWithSpec(
    specPackageName: string,
    contractAddress: string,
    method: string,
    namedArgs: Record<string, unknown>,
    sourceAccountId: string,
  ): Promise<BuiltInvocation> {
    const account = await this.loadAccountOrThrow(sourceAccountId);
    const contract = new Contract(contractAddress);
    const spec = getContractSpec(specPackageName);
    const scArgs = spec.funcArgsToScVals(method, namedArgs);

    const transaction = new TransactionBuilder(account, {
      fee: '1000',
      networkPassphrase: this.registry.getRpcConfig().network_passphrase,
    })
      .addOperation(contract.call(method, ...scArgs))
      .setTimeout(60)
      .build();

    const prepared = await this.server.prepareTransaction(transaction);

    return { xdr: prepared.toXDR(), latestLedger: (await this.server.getLatestLedger()).sequence };
  }

  async submitSignedTransaction(signedXdr: string): Promise<{ hash: string; status: string }> {
    const transaction = TransactionBuilder.fromXDR(
      signedXdr,
      this.registry.getRpcConfig().network_passphrase,
    );
    const sendResult = await this.server.sendTransaction(transaction);

    if (sendResult.status === 'ERROR') {
      this.logger.warn(`Transaction submission failed: ${JSON.stringify(sendResult.errorResult)}`);
    }

    return { hash: sendResult.hash, status: sendResult.status };
  }

  async getTransactionStatus(hash: string) {
    return this.server.getTransaction(hash);
  }

  /** Raw contract events since `startLedger`, decoded to native values — used by the event indexer. */
  async getEvents(contractAddress: string, startLedger: number) {
    const response = await this.server.getEvents({
      startLedger,
      filters: [{ type: 'contract', contractIds: [contractAddress] }],
    });

    return {
      latestLedger: response.latestLedger,
      events: response.events.map((event) => ({
        ledger: event.ledger,
        txHash: 'txHash' in event ? (event as { txHash?: string }).txHash : undefined,
        topics: event.topic.map((t) => scValToNative(t)),
        data: scValToNative(event.value),
      })),
    };
  }

  private async loadAccountOrThrow(accountId: string): Promise<Account> {
    try {
      return await this.server.getAccount(accountId);
    } catch (error) {
      throw new Error(
        `Could not load account ${accountId} from ${this.registry.getNetwork()} — it must exist on-chain to build a transaction envelope: ${(error as Error).message}`,
      );
    }
  }

  private toScVal(value: unknown): xdr.ScVal {
    return nativeToScVal(value);
  }
}
