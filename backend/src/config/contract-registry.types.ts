/**
 * Mirrors the shape of deployments/registry.json and the per-network
 * manifest (see deployments/README.md). Kept as plain types here rather
 * than importing scripts/deployment_registry.ts directly — that file
 * lives in a separate npm package (scripts/) with its own lockfile, and
 * this backend intentionally doesn't take a cross-package dependency on
 * it. The read behavior (throw loudly on an undeployed address, per the
 * repo's own documented convention) is preserved.
 */

export interface RegistryContractEntry {
  address: string | null;
  version: number;
}

export interface RegistryNetworkEntry {
  network_passphrase: string;
  rpc_url: string;
  manifest: string;
  deployed_at: string | null;
  contracts: Record<string, RegistryContractEntry>;
}

export interface Registry {
  schema_version: number;
  networks: Record<string, RegistryNetworkEntry>;
}

export interface ManifestContractEntry {
  package: string;
  address: string | null;
  version: number;
  depends_on: Record<string, { min_version: number }>;
}

export interface Manifest {
  network: string;
  admin: string;
  contracts: Record<string, ManifestContractEntry>;
}

export interface RpcEndpointsConfig {
  [network: string]: {
    primary_rpc: string;
    fallback_rpc: string;
    horizon_url: string;
    network_passphrase: string;
  };
}

/** A resolved contract slot, combining registry + manifest + static-config data. */
export interface ResolvedContract {
  /** The registry/manifest key, e.g. "user_portfolio" (this is a deployment *slot*, not necessarily the crate name — see `package`). */
  key: string;
  /** The actual crate/package deployed at this slot. Can differ from `key`; always trust this over the key. */
  package: string;
  address: string | null;
  version: number | null;
  deployed: boolean;
  /** Where this entry's data came from — useful for surfacing "why is this null" in status endpoints. */
  source: 'registry' | 'manifest-only' | 'static-config' | 'unconfigured';
}
