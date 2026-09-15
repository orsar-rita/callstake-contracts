# CallStake backend

NestJS API integrating the CallStake Soroban contracts
(`call-stake/contracts/`) with a Postgres/Redis-backed read model. See
[docs/BACKEND_SCOPE.md](../docs/BACKEND_SCOPE.md) for what's built vs.
deferred and why.

## Running locally

```bash
cp .env.example .env        # edit JWT_SECRET at minimum
docker compose up -d postgres redis
npm install
npm run migration:run
npm run start:dev
```

The API listens on `http://localhost:3000`; Swagger docs are at
`http://localhost:3000/docs`.

To run everything (including the backend) in Docker:

```bash
docker compose up --build
```

## Scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | Dev server with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm test` | Unit + integration tests (Jest) |
| `npm run lint` | ESLint |
| `npm run migration:run` | Apply pending TypeORM migrations |
| `npm run migration:generate -- src/database/migrations/Name` | Generate a migration from entity changes (needs a running Postgres matching `.env`) |

## Contract reads need a funded account

Every `GET /contracts/*` endpoint simulates a call through Soroban RPC,
which requires a real, existing source account to build the transaction
envelope (a Soroban requirement, not a design choice here) — set
`SOROBAN_SIMULATION_ACCOUNT` in `.env` to one. On testnet, generate and
fund one with the Stellar CLI and
[friendbot](https://friendbot.stellar.org).

## Nothing is deployed yet

Every contract address in `deployments/registry.json` is currently
`null`. Read/write endpoints for an undeployed contract return `503
ContractNotDeployed` rather than failing unpredictably — this is
expected today, not a bug.

## Known limitations

- **No live/sandbox Soroban network was reachable while building this**,
  so every contract-integration test mocks `SorobanClientService` at
  the boundary (see [docs/BACKEND_ARCHITECTURE.md](../docs/BACKEND_ARCHITECTURE.md#testing-strategy)).
  Nothing here has been exercised against a real deployed contract.
- A few write paths (`signal_registry.create_signal`,
  `governance.create_proposal`/`cast_vote`) pass the contracts' custom
  Soroban enum arguments through generically; the exact on-chain XDR
  encoding for those specific enums is unverified — see each service's
  doc comment.
- **No HTTP-level e2e suite** (supertest against a running server) —
  that needs a live Postgres+Redis, which `docker-compose.yml` provides
  for local/CI use but wasn't available while building this.
  `src/integration/money-path.integration.spec.ts` covers the same
  money-path across real service instances instead.
- `npm audit` currently reports 19 production vulnerabilities, all
  moderate/high, all requiring a breaking-change upgrade
  (`@stellar/stellar-sdk` 13.x→17.x, an indirect `uuid` bump via
  `@nestjs/typeorm`) to fix — not something to force through without
  re-verifying against those major versions, so left as-is and flagged
  here rather than silently ignored or blindly force-upgraded.
