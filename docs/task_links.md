# Task → Source File Cross-Reference

This doc maps the security/resilience tasks we discussed to the concrete source files in the repo.

- Oracle: safer fallback & safe price exposure
  - Core: [call-stake/contracts/oracle/src/lib.rs](call-stake/contracts/oracle/src/lib.rs)
  - Staleness/heartbeat: [call-stake/contracts/oracle/src/staleness.rs](call-stake/contracts/oracle/src/staleness.rs)
  - Storage: [call-stake/contracts/oracle/src/storage.rs](call-stake/contracts/oracle/src/storage.rs)

- Oracle: external adapter signature & reporter validation
  - Adapter: [call-stake/contracts/oracle/src/external_adapter.rs](call-stake/contracts/oracle/src/external_adapter.rs)
  - Types: [call-stake/contracts/oracle/src/types.rs](call-stake/contracts/oracle/src/types.rs)
  - Governance (oracle registry / weights): [call-stake/contracts/oracle/src/governance.rs](call-stake/contracts/oracle/src/governance.rs)

- Fee collector: configurable alternate fee-payment assets
  - Main: [call-stake/contracts/fee_collector/src/lib.rs](call-stake/contracts/fee_collector/src/lib.rs)
  - Storage: [call-stake/contracts/fee_collector/src/storage.rs](call-stake/contracts/fee_collector/src/storage.rs)
  - Rebates/conversion: [call-stake/contracts/fee_collector/src/rebates.rs](call-stake/contracts/fee_collector/src/rebates.rs)

- Portfolio insurance: expose solvency/health metric
  - Insurance logic: [call-stake/contracts/auto_trade/src/portfolio_insurance.rs](call-stake/contracts/auto_trade/src/portfolio_insurance.rs)
  - Public wrapper: [call-stake/contracts/auto_trade/src/lib.rs](call-stake/contracts/auto_trade/src/lib.rs)

Next steps
- I can implement the safe signature checking in `external_adapter.rs` next (verify ed25519 signatures and require registered oracle addresses). Want me to start that change now?

Created by automation: concise mapping to speed implementation and reviews.
