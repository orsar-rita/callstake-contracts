# Backend scope

This document is the triage decision behind `backend/`, a new NestJS
service being added to this monorepo alongside the Soroban contracts
workspace (`call-stake/`) and the frontend. It exists to give the
backend an honest boundary before any code is written, and to record
*why* things were left out rather than silently dropping them.

## Why a scope cut was necessary

The architectural reference for this backend,
[AgesEmpire/StellarSwipe-Backends](https://github.com/AgesEmpire/StellarSwipe-Backends),
has roughly 155 top-level module folders under `src/` — auth, KYC,
SSO/SAML, multi-tenancy, disaster recovery, a CMS, a data lake,
Discord/Telegram bots, NFT badges, an ML module, and more. Reproducing
that surface area with real logic and real tests is not a 40-commit
job. Scaffolding all of it with empty services would produce a backend
that *looks* complete and does nothing — that is worse than a smaller
backend that actually works, so it was rejected as an option.

The cut below prioritizes: (1) whatever the on-chain contracts in
`call-stake/contracts/` actually need a backend for, (2) the platform
floor those modules can't function without, (3) everything else, built
only if commits remain.

## Building now (priority order)

1. **Project scaffold, config, database, logging** — nothing else can
   be built or tested without these.
2. **Auth** — wallet challenge/response (sign a server-issued nonce
   with a Freighter-compatible Stellar keypair) plus JWT issuance.
   Chosen over password auth because every write path downstream
   (staking, signal submission, voting) is ultimately gated by a
   Stellar `Address`, so proving control of that address is the actual
   trust boundary, not a password.
3. **Users** — profile plus wallet-address linking; the record every
   other module joins against.
4. **Signal registry integration** — `signal_registry` is the
   contract users interact with most (submit/view signals,
   leaderboard, provider reputation). Read+write wrapper over the
   deployed contract, backed by the real function surface in
   `call-stake/contracts/signal_registry/src/lib.rs`.
5. **Stake vault integration** — staking is the other half of the
   provider trust model (`deposit_stake`, `get_voting_power`, slashing
   reads). Directly gates who is allowed to submit signals.
6. **Fee collector integration** — fee-rate/treasury/claim reads,
   needed for any UI that shows a user what they paid or a provider
   what they're owed.
7. **Governance integration** — proposal/vote read-and-relay. Lower
   traffic than the above but still a first-class contract.
8. **Oracle integration** — price feed reads plus staleness/deviation
   surfacing, needed by portfolio valuation and by auto_trade's risk
   checks.
9. **Trade execution relay** (`auto_trade` / `trade_executor`) —
   order submission relay and risk-limit surfacing. Built as a relay
   over the real contract functions, not a reimplementation of the
   contracts' risk logic.
10. **Portfolio, leaderboard, analytics (read models)** — DB-cached
    read APIs over the contracts above; this is what the frontend
    actually renders.
11. **KYC gating** — `user_portfolio` has real on-chain KYC state
    (`set_kyc_status`, `is_kyc_verified`, `get_kyc_required_mode`), so
    this is not speculative enterprise scope, it mirrors a contract
    that already exists. Built minimally: check-before-relay, no
    document upload or verification-provider integration.
12. **Notifications (minimal)** — event-driven, backed by the indexer
    below; no email/SMS provider integration.
13. **Admin (minimal)** — operational visibility (contract pause
    states, registry/manifest status) only. Not a management console.
14. **Cross-cutting**: Swagger docs, rate limiting/validation, Redis
    caching, BullMQ queues, an event indexer syncing contract events
    into Postgres, integration tests on the core money-path, CI,
    Docker Compose for local dev.

## Scope update discovered while building

The plan above assumed a "trade execution relay" over `auto_trade`/
`trade_executor` would be buildable once `signal_registry`/`stake_vault`/
`fee_collector`/`governance`/`oracle` were done. Building the contract
integration layer surfaced that this isn't addressable yet:
`deployments/testnet.manifest.json`'s `"user_portfolio"` slot actually
deploys the `auto_trade` package, and its `"trade_executor"` slot
deploys `bridge` — the real `user_portfolio` and `trade_executor`
crates have **no deployment slot at all** under their own names
anywhere in this repo. `auto_trade`, `bridge`, `stake_vault` and
`trade_executor` are also 4 of the workspace's 14 crates that don't
currently compile (`cargo build --workspace`), independent of this
manifest issue.

Given that, `user_portfolio` integration was scaled back to what's
genuinely resolvable: read-only portfolio/PnL/KYC-status endpoints
behind an explicit `USER_PORTFOLIO_CONTRACT_ADDRESS` env override
(rather than guessing an address or quietly calling the wrong
contract), plus a real, tested `KycGuard` ready to protect a future
trade-relay endpoint. A full `auto_trade`/`trade_executor` order-
submission relay is deferred until the manifest correctly addresses
those crates and they build — flagging that mapping is worth this
repo's attention independent of the backend.

## Deferred entirely (with reasoning)

- **SSO/SAML, multi-tenancy, data residency, i18n** — enterprise/B2B
  scope with no current customer asking for it; this is a single-tenant
  consumer product today.
- **Disaster-recovery tooling, executive dashboards, a CMS, a data
  lake** — operational maturity features for a system that isn't
  deployed yet (every contract address in `deployments/*.manifest.json`
  is currently `null` — nothing is live on any network). Premature.
- **Discord/Telegram bots, NFT badges, social sharing, achievements/
  gamification** — growth features layered on top of a working core
  product; there is no core product yet.
- **ML module, AI assistant/validation** — nothing in the contracts
  produces the signals or labels these would need; would be a stub by
  construction.
- **Webhooks** — no external integration partner has been identified
  yet to justify the surface area (auth, delivery retries, signing).
  Revisit once a concrete consumer exists.
- **Cross-chain bridge integration** — `bridge` is one of the four
  contracts that don't currently compile in this workspace (see the
  workspace's known state: `auto_trade`, `bridge`, `stake_vault`,
  `trade_executor` all fail `cargo build --workspace`). Integrating a
  backend against a contract interface that's still being fixed on the
  Rust side would be built on sand; revisit once `bridge` builds.
- **Tax reporting, order management system, position sizing
  calculator, SLA monitoring, competitions/contests** — real product
  ideas, but downstream of the core flows above, not blocking them.

## Depth over breadth

Everything listed under "Building now" is meant to be a genuine
implementation with tests, not a folder with an empty service in it.
Where a module in that list ends up being minimal rather than fully
featured (KYC gating, notifications, admin, analytics), that's stated
plainly above and will be restated in the final delivery report — a
file existing is not a claim that it works.
