# Backend architecture

See [BACKEND_SCOPE.md](BACKEND_SCOPE.md) first for what's built vs.
deferred and why. This doc is the module map and the mechanics of how
`backend/` talks to `call-stake/contracts/`.

## Module map

```
AppModule
├── ConfigModule (@Global)       — env validation (zod), ContractRegistryService
├── ThrottlerModule              — 120 req/min default, tighter on auth
├── CacheConfigModule (@Global)  — Redis-backed response cache (opt-in per endpoint)
├── DatabaseModule               — TypeORM/Postgres, synchronize:false, migrations only
├── RedisModule (@Global)        — shared ioredis client (auth nonces, cache, queues)
├── StellarModule (@Global)      — SorobanClientService: the one place that talks to RPC
├── HealthModule                 — GET /health (real DB/Redis liveness checks)
├── AuthModule                   — wallet challenge/response, JWT
├── UsersModule                  — profile, secondary wallet linking
├── ContractsModule
│   ├── SignalRegistryModule
│   ├── StakeVaultModule
│   ├── FeeCollectorModule
│   ├── GovernanceModule
│   ├── OracleModule (read-only)
│   └── UserPortfolioModule      — address override required, see below
├── AdminModule                  — GET /admin/contracts (is_admin-gated)
├── NotificationsModule          — SSE over EventEmitter2
├── AnalyticsModule              — composes StakeVault + FeeCollector reads
├── QueueModule                  — BullMQ: leaderboard refresh job
└── IndexerModule                — BullMQ: syncs contract events into Postgres
```

Every module above is imported into `AppModule` (directly, or via
`ContractsModule`) — nothing is built but left unreachable.

## How contract addresses are resolved

`ContractRegistryService` (`src/config/contract-registry.service.ts`) is
the single source of truth, reading this repo's own deployment
metadata rather than assuming anything:

- `deployments/registry.json` — canonical, versioned addresses per
  network (`address: null` until deployed).
- `deployments/<network>.manifest.json` — which crate (`package`) is
  deployed at each slot, and its version.
- `config/rpc_endpoints.json` — RPC/Horizon URLs and network passphrase.
- `config/<network>.json` — a few flat addresses (e.g. `oracle_address`)
  not tracked in the versioned registry.

**Important:** a manifest slot's key does not always match the crate
deployed there. `deployments/testnet.manifest.json`'s `"user_portfolio"`
slot deploys the `auto_trade` package; its `"trade_executor"` slot
deploys `bridge`. `ContractRegistryService.resolve(slot)` always
returns `.package` alongside `.address` so callers can tell — a test in
`contract-registry.service.spec.ts` pins this exact behavior. The real
`user_portfolio` and `trade_executor` crates have no tracked slot at
all today; `UserPortfolioModule` requires an explicit
`USER_PORTFOLIO_CONTRACT_ADDRESS` override rather than guessing.

Every address in the registry is currently `null` — nothing is deployed
on any network. `ContractNotDeployedError` (thrown by
`requireAddress()`) is mapped to HTTP 503 by the global exception
filter, not a generic 500: this is expected, current repo state, not a
bug.

## Read/write pattern

Every contract-integration module follows the same shape:

- **Reads** go through `SorobanClientService.callReadOnly` —
  simulation only, no fee, no submission. Decoding a contract return
  value (`scValToNative`) is unambiguous regardless of shape, so these
  are exact.
- **Writes** go through `SorobanClientService.buildInvocation`, which
  returns **unsigned** transaction XDR. The backend never signs or
  holds a private key for a user-owned account — the frontend signs
  with Freighter (matching its existing `@stellar/freighter-api`
  integration) and calls the module's `submit` endpoint, which just
  relays the signed envelope to RPC.
- A handful of write paths (`signal_registry.create_signal`,
  `governance.create_proposal`/`cast_vote`) take the contracts' custom
  Soroban enum types (`SignalAction`, `ProposalType`, ...) as plain
  strings, passed through `nativeToScVal` generically. This is exact
  for primitives but **not verified** against those specific enums'
  on-chain XDR encoding — doing so needs the contract's compiled spec,
  which isn't wired in. Flagged in each service's doc comment rather
  than silently assumed correct.

## Async processing

`QueueModule` and `IndexerModule` both use BullMQ against the same
Redis instance, and both use `Queue.upsertJobScheduler` (not raw
`repeat`) so a restart doesn't pile up duplicate repeatables. The
indexer's per-event decode/store/cursor-advance logic is real and
tested; in practice it no-ops today since every slot is undeployed
(logged once, not treated as an error).

## Testing strategy

No live or sandbox Soroban network is reachable from this environment,
so every contract-integration test mocks `SorobanClientService` at the
boundary and exercises real business logic above it (argument
shaping, error mapping, who signs what). `src/integration/money-path.integration.spec.ts`
does the same across module boundaries (login → stake → signal →
fee claim) rather than per-service. `SorobanClientService`'s own tests
mock only `rpc.Server` and exercise the SDK's real XDR encode/decode.
