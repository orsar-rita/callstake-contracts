import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  Manifest,
  Registry,
  ResolvedContract,
  RpcEndpointsConfig,
} from './contract-registry.types';

export class ContractNotDeployedError extends Error {
  constructor(contract: string, network: string) {
    super(`Contract "${contract}" has no deployed address on ${network} yet.`);
    this.name = 'ContractNotDeployedError';
  }
}

/**
 * Resolves contract addresses and RPC settings from this repo's own
 * deployment metadata (deployments/registry.json, deployments/*.manifest.json,
 * config/rpc_endpoints.json, config/<network>.json), rather than assuming a
 * generic contract layer the way the reference backend did.
 *
 * As of this writing every address in deployments/registry.json is `null` —
 * nothing is deployed on any network yet — so this service is built to make
 * that state a first-class, non-crashing outcome (see ResolvedContract.source
 * and .deployed) rather than something callers have to special-case.
 */
@Injectable()
export class ContractRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ContractRegistryService.name);
  private readonly repoRoot: string;
  private readonly network: string;

  private registry!: Registry;
  private manifest!: Manifest;
  private rpcEndpoints!: RpcEndpointsConfig;
  private staticNetworkConfig: Record<string, unknown> = {};

  constructor(private readonly configService: ConfigService) {
    // backend/src/config -> backend/src -> backend -> repo root
    this.repoRoot = resolve(__dirname, '..', '..', '..');
    this.network = this.configService.get<string>('stellar.network', 'testnet');
  }

  onModuleInit() {
    this.registry = this.readJson<Registry>('deployments/registry.json');
    this.rpcEndpoints = this.readJson<RpcEndpointsConfig>('config/rpc_endpoints.json');

    const manifestRelPath = this.registry.networks[this.network]?.manifest;
    this.manifest = manifestRelPath
      ? this.readJson<Manifest>(manifestRelPath)
      : { network: this.network, admin: '', contracts: {} };

    const staticConfigPath = `config/${this.network}.json`;
    this.staticNetworkConfig = existsSync(join(this.repoRoot, staticConfigPath))
      ? this.readJson<Record<string, unknown>>(staticConfigPath)
      : {};

    this.logger.log(
      `Contract registry loaded for network "${this.network}" (${
        Object.keys(this.registry.networks[this.network]?.contracts ?? {}).length
      } tracked slots)`,
    );
  }

  private readJson<T>(relativePath: string): T {
    const overridePath = this.configService.get<string>('stellar.contractRegistryPath');
    const path = overridePath
      ? join(overridePath, relativePath)
      : join(this.repoRoot, relativePath);
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  }

  getNetwork(): string {
    return this.network;
  }

  getRpcConfig() {
    const endpoints = this.rpcEndpoints[this.network];
    if (!endpoints) {
      throw new Error(`No RPC endpoints configured for network "${this.network}"`);
    }
    return endpoints;
  }

  /** Resolves a deployment slot (e.g. "stake_vault", "signal_registry") against registry + manifest. */
  resolve(slot: string): ResolvedContract {
    const networkEntry = this.registry.networks[this.network];
    const registryEntry = networkEntry?.contracts[slot];
    const manifestEntry = this.manifest.contracts[slot];

    if (registryEntry) {
      return {
        key: slot,
        package: manifestEntry?.package ?? slot,
        address: registryEntry.address,
        version: registryEntry.version,
        deployed: registryEntry.address !== null,
        source: 'registry',
      };
    }

    if (manifestEntry) {
      return {
        key: slot,
        package: manifestEntry.package,
        address: manifestEntry.address,
        version: manifestEntry.version,
        deployed: manifestEntry.address !== null,
        source: 'manifest-only',
      };
    }

    // A handful of contracts (oracle, governance, analytics) aren't tracked
    // in the versioned registry/manifest at all. Some still have a flat
    // address in config/<network>.json (e.g. oracle_address) — fall back to
    // that rather than reporting them as entirely unconfigured.
    const staticKey = `${slot}_address`;
    const staticAddress = this.staticNetworkConfig[staticKey];
    if (typeof staticAddress === 'string' && !staticAddress.startsWith('REPLACE_WITH_')) {
      return {
        key: slot,
        package: slot,
        address: staticAddress,
        version: null,
        deployed: true,
        source: 'static-config',
      };
    }

    return {
      key: slot,
      package: slot,
      address: null,
      version: null,
      deployed: false,
      source: 'unconfigured',
    };
  }

  /** Same as resolve(), but throws if the contract has no live address — for call paths that cannot proceed without one. */
  requireAddress(slot: string): string {
    const resolved = this.resolve(slot);
    if (!resolved.address) {
      throw new ContractNotDeployedError(slot, this.network);
    }
    return resolved.address;
  }

  listAll(): ResolvedContract[] {
    const slots = new Set<string>([
      ...Object.keys(this.registry.networks[this.network]?.contracts ?? {}),
      ...Object.keys(this.manifest.contracts),
      'oracle',
      'governance',
      'analytics',
    ]);
    return Array.from(slots).map((slot) => this.resolve(slot));
  }
}
