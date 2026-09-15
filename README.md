# CallStake

CallStake is a decentralized trading-signal platform built on Stellar
using Soroban smart contracts. Signal providers register trade calls,
stake against their reputation, and get paid from protocol fees; users
follow, vote on, and (increasingly) auto-execute those signals. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

## Repository layout

```
call-stake/          Live Soroban contract workspace (Rust) — see below
backend/             NestJS API — auth, users, and read/relay access to the contracts (see below)
frontend/            Next.js + React frontend, Freighter wallet integration
scripts/             Deployment, snapshot/replay, and e2e tooling (TypeScript/Python)
config/              Per-network config (mainnet.json, testnet.json, rpc_endpoints.json)
deployments/         Deployment manifests and the contract address registry
docs/                Architecture, security, and per-feature reference docs
tests/               End-to-end and regression suites (separate from per-crate unit tests)
```

**`call-stake/` is the only live contract workspace.** Its
`Cargo.toml` defines the workspace members, and every CI workflow under
`.github/workflows/` builds and tests from inside it — `cd call-stake
&& cargo test --workspace --all-targets` is the baseline gate. A legacy,
much smaller `contracts/` tree used to sit at the repo root; it predated
this workspace, wasn't a Cargo workspace member, wasn't referenced by
CI or by any script/doc, and has been removed.

### Contracts (`call-stake/contracts/`)

| Crate | Role |
|---|---|
| `signal_registry` | Signal registration/scoring, provider reputation, leaderboards, contests |
| `stake_vault` | Staking, rewards, slashing, emergency unstake |
| `fee_collector` | Protocol fee collection/splitting, rebates, referral fee-share |
| `governance` | Proposals, voting, timelocks, treasury, committees |
| `oracle` | Price feeds — quorum, staleness/freshness, deviation guards |
| `auto_trade` | Automated trade execution: risk limits, drawdown guards, escrow |
| `trade_executor` | Order execution: DCA, leverage, batch settlement, SDEX routing |
| `bridge` | Cross-chain messaging/liquidity with a validator set |
| `user_portfolio` | User positions, watchlists, badges, exposure caps |
| `analytics` | TVL, risk scoring, query caching |
| `shared`, `common` | Shared primitives: pausable/reentrancy guards, access control, math |
| `stake_vault_kani` | Kani formal-verification harness for the stake vault |
| `integration_tests` | Cross-contract integration tests |

## Getting started

```bash
rustup target add wasm32-unknown-unknown
cd call-stake
cargo test --workspace --all-targets   # run the full contract test suite
cargo fmt --all -- --check             # matches CI's format gate
cargo clippy --workspace --all-targets -- -D warnings   # matches CI's lint gate
./scripts/build.sh                     # build + optimize release WASM
```

For the frontend:

```bash
cd frontend
npm install
npm run dev
```

For the backend:

```bash
cd backend
cp .env.example .env        # edit JWT_SECRET at minimum
docker compose up -d postgres redis
npm install
npm run migration:run
npm run start:dev
```

See [docs/deployment.md](docs/deployment.md) for deploying to testnet/mainnet,
and [CONTRIBUTING.md](CONTRIBUTING.md) for scaffolding a new contract crate.

## Backend (`backend/`)

A NestJS API providing auth (Stellar wallet challenge/response), user
profiles, and read/relay access to the contracts above — the backend
never signs or holds a user's private key; it builds unsigned
transactions for the frontend to sign with Freighter. See
[docs/BACKEND_SCOPE.md](docs/BACKEND_SCOPE.md) for what's built vs.
deferred and why, and [docs/BACKEND_ARCHITECTURE.md](docs/BACKEND_ARCHITECTURE.md)
for the module map and how it resolves contract addresses from this
repo's own `deployments/` and `config/`.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design and contract interactions
- [docs/BACKEND_SCOPE.md](docs/BACKEND_SCOPE.md) / [docs/BACKEND_ARCHITECTURE.md](docs/BACKEND_ARCHITECTURE.md) — backend scope and module map
- [docs/faq.md](docs/faq.md) — Soroban/workspace-specific FAQ
- [docs/security/](docs/security/) — threat model, disclosure process, per-topic security analyses
- [SECURITY.md](SECURITY.md) — vulnerability disclosure policy
- `call-stake/docs/` — implementation-level docs for individual contract patterns (cross-contract auth, event macros, governance timelocks, etc.)

## Contributing

This is a multi-contributor open-source project; most work lands as PRs
against individual GitHub issues. See [CONTRIBUTING.md](CONTRIBUTING.md).
