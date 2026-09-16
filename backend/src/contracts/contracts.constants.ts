/**
 * Deployment slot names, as used in deployments/registry.json and
 * deployments/testnet.manifest.json. A slot's key is not guaranteed to
 * match the crate deployed there — always resolve through
 * ContractRegistryService.resolve(slot).package before assuming which
 * contract you're calling. (Historical note: the manifest's
 * "user_portfolio" and "trade_executor" slots pointed at the auto_trade
 * and bridge packages respectively until that was fixed — see
 * docs/CONTRACT_BUILD_DIAGNOSIS.md. Both slots now deploy their own
 * real crate; this file still has no USER_PORTFOLIO/TRADE_EXECUTOR
 * entry because no backend module resolves through the registry for
 * them yet — see UserPortfolioService's doc comment.)
 */
export const CONTRACT_SLOTS = {
  SIGNAL_REGISTRY: 'signal_registry',
  STAKE_VAULT: 'stake_vault',
  FEE_COLLECTOR: 'fee_collector',
  GOVERNANCE: 'governance',
  ORACLE: 'oracle',
} as const;
