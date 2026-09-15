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
