/**
 * Deployment slot names, as used in deployments/registry.json and
 * deployments/testnet.manifest.json. IMPORTANT: a slot's key does not
 * always match the crate actually deployed there — always resolve through
 * ContractRegistryService.resolve(slot).package before assuming which
 * contract you're calling. As of this writing, for example, the
 * "user_portfolio" slot deploys the auto_trade package and the
 * "trade_executor" slot deploys the bridge package (see
 * ContractRegistryService's own doc comment and its spec file).
 */
export const CONTRACT_SLOTS = {
  SIGNAL_REGISTRY: 'signal_registry',
  STAKE_VAULT: 'stake_vault',
  FEE_COLLECTOR: 'fee_collector',
  GOVERNANCE: 'governance',
  ORACLE: 'oracle',
} as const;
