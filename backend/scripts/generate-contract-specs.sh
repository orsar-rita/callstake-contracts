#!/usr/bin/env bash
# Regenerate backend/src/contracts/specs/*.spec.xdr.txt from the actual
# compiled contract WASM, using the Stellar CLI's spec extractor. These
# snapshots are what ContractSpecRegistry (src/stellar/contract-spec-registry.ts)
# loads to correctly encode arguments for contract functions whose parameters
# include custom Soroban enums (e.g. SignalAction, ProposalType) -- generic
# nativeToScVal(value) cannot represent those types correctly (see
# docs/CONTRACT_BUILD_DIAGNOSIS.md and contract-spec-registry.spec.ts).
#
# Run this whenever a covered contract's public function signatures or
# #[contracttype] enums change, and commit the resulting .txt files.
#
# Requires: the Stellar CLI (`stellar`) and a built release WASM for each
# covered contract (`cargo build --target wasm32-unknown-unknown --release`
# in call-stake/).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$BACKEND_ROOT/.." && pwd)"
CALL_STAKE="$REPO_ROOT/call-stake"
WASM_DIR="$CALL_STAKE/target/wasm32-unknown-unknown/release"
SPEC_DIR="$BACKEND_ROOT/src/contracts/specs"

command -v stellar >/dev/null || { echo "error: stellar CLI not found" >&2; exit 1; }

# Contracts whose public functions take a custom #[contracttype] enum
# argument and are called from the backend's write path.
COVERED_PACKAGES=(signal_registry governance)

mkdir -p "$SPEC_DIR"

for package in "${COVERED_PACKAGES[@]}"; do
  echo "==> building $package (release, wasm32-unknown-unknown)"
  (cd "$CALL_STAKE" && cargo build -p "$package" --target wasm32-unknown-unknown --release)

  wasm="$WASM_DIR/$package.wasm"
  [[ -f "$wasm" ]] || { echo "error: missing $wasm after build" >&2; exit 1; }

  out="$SPEC_DIR/$package.spec.xdr.txt"
  echo "==> extracting spec: $wasm -> $out"
  stellar contract info interface --wasm "$wasm" --output xdr-base64 > "$out"
done

echo "Done. Review the diff in $SPEC_DIR before committing."
