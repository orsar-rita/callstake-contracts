import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { XdrReader } from '@stellar/js-xdr';
import { contract, xdr } from '@stellar/stellar-sdk';

/**
 * Loads a compiled contract's real spec (see
 * backend/scripts/generate-contract-specs.sh) and exposes it as an
 * `@stellar/stellar-sdk` `contract.Spec`, so write-path argument encoding for
 * a contract's custom Soroban enums (SignalAction, ProposalType, ...) goes
 * through the same type information the contract itself was compiled with,
 * instead of SorobanClientService's generic `nativeToScVal(value)` — which
 * cannot represent a Soroban union type from a bare JS value and was
 * confirmed to encode e.g. `"Buy"` as `scvString` instead of the
 * `scvVec([scvSymbol("Buy")])` a `SignalAction` argument actually requires
 * (see docs/CONTRACT_BUILD_DIAGNOSIS.md and contract-spec-registry.spec.ts).
 *
 * Each `.spec.xdr.txt` file is a base64-encoded stream of concatenated
 * `ScSpecEntry` XDR values, exactly what `stellar contract info interface
 * --output xdr-base64` prints for a given WASM. `contract.Spec` wants an
 * array of individual entries, so this parses the stream with `XdrReader`
 * the same way the Stellar CLI itself does internally.
 */
const SPEC_DIR = join(__dirname, '..', 'contracts', 'specs');

const specCache = new Map<string, contract.Spec>();

function parseSpecEntries(base64Stream: string): xdr.ScSpecEntry[] {
  const reader = new XdrReader(Buffer.from(base64Stream.trim(), 'base64'));
  const entries: xdr.ScSpecEntry[] = [];
  while (!reader.eof) {
    // stellar-sdk's generated .d.ts types ScSpecEntry.read() as taking a
    // Buffer, but the underlying js-xdr generated reader also accepts (and
    // requires, to read entries sequentially rather than from offset 0
    // each time) an XdrReader instance directly — confirmed against the
    // real compiled spec in contract-spec-registry.spec.ts.
    entries.push(xdr.ScSpecEntry.read(reader as unknown as Buffer));
  }
  return entries;
}

/**
 * Load (and cache) the `contract.Spec` for a covered contract package, by
 * the name of its `.spec.xdr.txt` file under `src/contracts/specs/`
 * (currently `signal_registry` and `governance` — the two contracts with a
 * write-path enum argument the backend actually calls).
 *
 * @throws if no spec snapshot exists for `packageName` — run
 * `scripts/generate-contract-specs.sh` and commit the result rather than
 * silently falling back to unverified generic encoding.
 */
export function getContractSpec(packageName: string): contract.Spec {
  const cached = specCache.get(packageName);
  if (cached) return cached;

  const path = join(SPEC_DIR, `${packageName}.spec.xdr.txt`);
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    throw new Error(
      `No contract spec snapshot for "${packageName}" at ${path}. ` +
        'Run backend/scripts/generate-contract-specs.sh and commit the result.',
    );
  }

  const spec = new contract.Spec(parseSpecEntries(raw));
  specCache.set(packageName, spec);
  return spec;
}
