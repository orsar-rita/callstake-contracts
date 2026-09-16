# Contract build breakage + deployment manifest mismatch — diagnosis

Two findings were reported together because they name the same four
crates (`stake_vault`, `trade_executor`, `bridge`, `auto_trade`):

1. `cargo build -p <crate>` fails for all four, with stable errors across
   sessions.
2. `deployments/{testnet,mainnet.manifest.example}.json` maps the
   `user_portfolio` slot to the `auto_trade` package and the
   `trade_executor` slot to the `bridge` package, and neither
   `user_portfolio` nor `trade_executor` has a real slot of its own.

**Conclusion: these are two unrelated bugs, from unrelated commits, that
happen to share crate names by coincidence.** The manifest bug predates
every build-breaking commit by roughly five weeks and was never touched
again. The build breakage itself further splits into two *different*
root causes (three crates share one; `bridge` has a completely separate
one). Evidence for each below.

## Finding 2 first, because it's the simpler one: the deployment manifest

`git log --oneline -- deployments/testnet.manifest.json
deployments/mainnet.manifest.example.json` shows only three commits ever
touched these files:

- `dd7f94ea` "upgrade safety" (2026-07-24) — **created** both manifest
  files from scratch (Issue #822), already containing
  `"user_portfolio": { "package": "auto_trade", ... }` and
  `"trade_executor": { "package": "bridge", ... }`.
- `312edbbc` (2026-07-27) and `e92e06f6` (2026-09-15, a brand-path
  rename) — neither touches the `contracts` block's package mappings.

So the wrong mapping isn't drift or a bad merge — it was wrong from the
manifest's very first commit, five weeks before any of the build-breaking
commits (all dated 2026-08-29, see below). There is no shared commit.

**Was this intentional (a proxy design) or an omission?** Checked three
ways:
- `contracts/user_portfolio/src/lib.rs:357` and
  `contracts/trade_executor/src/lib.rs:354-355` each declare their own
  `#[contract] pub struct …Contract;` — full, independent contracts with
  their own entry points, not thin wrappers over `auto_trade`/`bridge`.
  Their `Cargo.toml` `name` fields are `user_portfolio` and
  `trade_executor` respectively — real, buildable workspace members.
- No doc, comment, or architecture note anywhere in `docs/` or the
  contract source describes `user_portfolio` as deploying through
  `auto_trade`, or `trade_executor` through `bridge`, as a design
  choice.
- `docs/BACKEND_SCOPE.md:75-98` ("Scope update discovered while
  building") independently documents the backend team hitting this same
  mismatch while wiring up contract integrations, concludes the mapping
  is wrong, and explicitly separates it from the build breakage: *"the
  real `user_portfolio` and `trade_executor` crates have no deployment
  slot at all under their own names anywhere in this repo. `auto_trade`,
  `bridge`, `stake_vault` and `trade_executor` are also 4 of the
  workspace's 14 crates that don't currently compile … **independent of
  this manifest issue**."*

Verdict: **omission bug**. `user_portfolio` and `trade_executor` were
always meant to be independently deployable and were simply never given
manifest slots — whoever wrote the Issue #822 manifest scaffolding
copy-pasted/guessed two package names instead of using the real ones.

**Fix plan (commit 2):** give `user_portfolio` and `trade_executor` their
own `contracts` entries with `"package"` equal to their own crate names,
in both `testnet.manifest.json` and `mainnet.manifest.example.json`.
Every `address` in the repo is currently `null` (nothing has ever been
deployed on any network — confirmed via `deployments/registry.json` and
`BACKEND_SCOPE.md`), so there is no live address to preserve or migrate;
this is a pure naming correction. `trade_executor`'s existing
`depends_on: { "user_portfolio": { "min_version": 2 } }` is kept as-is —
it was already expressing a real dependency, just pointed at the wrong
package underneath.

**Related but out of scope:** `call-stake/scripts/deploy_testnet.sh`
hardcodes its own, independent `logical → package` mapping (its own
comment header: `UserPortfolio → auto_trade package`, `TradeExecutor →
bridge package`), and additionally maps `StakeVault → governance
package` and `FeeCollector → oracle package` — even though `governance`
and `oracle` are separate, real contracts (`GovernanceContract`,
`OracleContract`) with no relation to `stake_vault`/`fee_collector`, and
even though the manifest itself already gets `stake_vault`/
`fee_collector` right. This script does not read `package` from the
manifest at all — it has its own hardcoded `deploy_if_needed <logical>
<package>` call sites. Since the task's stated finding is specifically
about the manifest, and the `stake_vault`/`governance` and
`fee_collector`/`oracle` half of this script issue is unrelated to any
of the four broken crates or to what was asked, only the script's
`user_portfolio`/`trade_executor` argument pair is corrected alongside
the manifest fix (same underlying mistake, same commit); the
`stake_vault`/`governance` and `fee_collector`/`oracle` mismatch is left
as-is and flagged here for separate follow-up.

## Finding 1: the build breakage — two unrelated root causes

`cargo build --workspace --keep-going` confirms exactly these 4 of 14
crates fail, nothing else. Root-caused independently per crate below;
they are **not** all the same bug.

### `stake_vault` and `trade_executor`: same root cause, one shared commit

Both fail with the identical error shape:

```
error[E0631]: type mismatch in function arguments
    .map_err(StakeVaultError::from)?;
    = note: expected function signature `fn(TokenFailure) -> _`
               found function signature `fn(StakeVaultError) -> _`
```

(`trade_executor`'s equivalent is `.map_err(ContractError::from)` in
`contracts/trade_executor/src/sdex.rs`.) Rust resolves `StakeVaultError::from`
to the blanket `impl<T> From<T> for T` (i.e. `From<StakeVaultError>`)
because **no `impl From<shared::TokenFailure> for StakeVaultError` (or
`for ContractError`) exists anywhere in either crate** —
`grep -rn "TokenFailure" contracts/stake_vault/ contracts/trade_executor/`
returns nothing but the call sites themselves.

`git log --oneline -- deployments/testnet.manifest.json` isn't relevant
here, but `git log -i --grep="1001"` finds the real shared commit:
**`4920ccfc` "Merge pull request #1051 … Standardize error mapping for
cross-contract token failures"** (2026-08-29, squashing branch
`fix/1001-error-mapping`, itself continuing `6828c8ec` "Add shared error
mapping for token/cross-contract invocation failures", Issue #1001).

That single merge touched `stake_vault/src/lib.rs` (+42/-15),
`trade_executor/src/sdex.rs` (+13), `fee_collector/src/errors.rs` (+40),
`fee_collector/src/lib.rs` (+64), `auto_trade/src/errors.rs` (+28), and
added `shared/src/token_error.rs` (the new `TokenFailure` classification
type, +220). The commit's own message says the intended pattern is:
switch every token/cross-contract call site from the panicking SDK
methods to `try_*` + `shared::token_error::map_result(...)`, then
`.map_err(LocalError::from)`, backed by **"each via a local `impl
From<TokenFailure> for <ContractError>`"** per contract.

`fee_collector` and `auto_trade` got that local `impl From<TokenFailure>`
added in the same commit (compare `contracts/fee_collector/src/errors.rs:187-201`,
which does exist and compiles). `stake_vault` and `trade_executor` got
their call sites converted to the new `try_*`/`map_err` pattern but
**never got the corresponding `impl From<TokenFailure> for …Error`
written** — an incomplete rollout of the same refactor, left half-done
in two of its four target crates.

**Fix plan (commits 4-5 or wherever they land in the fix sequence):** add
`impl From<shared::TokenFailure> for StakeVaultError` and `impl
From<shared::TokenFailure> for ContractError` (trade_executor),
following the exact classification precedent already established in
`fee_collector`'s impl: map `Unauthorized`/`InsufficientBalance` onto an
existing matching variant where one already exists with the right
meaning, and add new, additively-numbered variants (well under each
enum's headroom to the 50-variant XDR cap — `stake_vault` is at 43,
`trade_executor` at 38) for `InsufficientAllowance` and the
catch-all `InvalidRequest | Overflow | OtherContractError(_) |
HostError` case, matching `fee_collector`'s `InsufficientTokenAllowance`
/ `TokenOperationFailed` naming.

### `auto_trade`: same commit, different failure mode — the macro panics, not a missing impl

`auto_trade` *does* have the `impl From<shared::TokenFailure> for
AutoTradeError` (`contracts/auto_trade/src/errors.rs:142-158`, added in
the same `4920ccfc` commit) — so the `map_err` call sites are fine. The
actual failure is upstream of that:

```
error: custom attribute panicked
 --> contracts/auto_trade/src/errors.rs:3:1
  | #[contracterror]
  = help: message: called `Result::unwrap()` on an `Err` value: LengthExceedsMax
```

`AutoTradeError` has 51 variants (`InsufficientAllowance = 51` was added
by the same `4920ccfc` commit, +28 lines in `errors.rs`). Soroban's
`#[contracterror]` macro encodes the enum as an `ScSpecUdtErrorEnumV0`
whose `cases` field is `VecM<_, 50>` — a hard 50-case cap — and panics at
macro-expansion time once exceeded. Every downstream error
(`cannot find type AutoTradeError in this scope`, `unresolved import`,
189 errors total) is pure fallout from the type failing to be generated
at all; it is not 189 independent problems.

The sharpest evidence this was foreseeable: the same file already
documents the cap and works around it repeatedly. `errors.rs:382-405`
(added by earlier commits for Issues #811 and #992) reads:

> `AutoTradeError` is already at the 50-variant cap enforced by
> Soroban's contract-spec XDR format (`ScSpecUdtErrorEnumV0.cases:
> VecM<_, 50>`), so this reuses `SystemError` under a clearer name
> rather than adding a 51st discriminant (which fails the
> `#[contracterror]` macro at compile time with "LengthExceedsMax").

`4920ccfc` added `InsufficientAllowance` as a new 51st discriminant
anyway, doing exactly the thing that comment — sitting a few hundred
lines above the insertion point, in the same file — warns against.

**Fix plan (part of the same commit as stake_vault/trade_executor, or
its own commit if it doesn't fit cleanly):** demote `InsufficientAllowance`
from a real discriminant back to a `pub const` alias (the same pattern
used for every other post-cap addition in this file, e.g.
`IncompatibleContractVersion`, `AssetNotRegistered`), pointing at the
closest existing semantic match, `InsufficientBalance` (both mean "the
router couldn't move enough of the caller's tokens"). This restores the
enum to 50 variants, keeps the `AutoTradeError::InsufficientAllowance`
name available at every call site (now an alias, not a discriminant), and
requires no call-site changes.

### `bridge`: unrelated commit, unrelated mechanism — a bad merge dropped enum variants

`bridge` was explicitly *not* touched by `4920ccfc` — the Issue #1001
commit message says so directly: *"`contracts/bridge` … currently
performs no direct token or cross-contract invocations of its own … so
there is no unsafe passthrough to fix there."* Confirmed:
`grep -rn "TokenFailure" contracts/bridge/` returns nothing, and none of
`bridge`'s 20 build errors are `map_err`/`TokenFailure` shaped — they're
all `E0599: no variant … found for enum DataKey` / `enum BridgeError`.

Tracing `git log -oneline -- contracts/bridge/src/lib.rs`, the feature
that introduced every missing identifier is **`def62b7c` "fix: bridge
replay protection, withdrawal limits, idempotent execution, batch
hardening"** (2026-08-29, Issues #988-#990, #993) — coincidentally the
*same day* as the Issue #1001 merges, but a completely different branch
and PR. `git show def62b7c` confirms it added, among other things:

```
BridgeError::MessageAlreadyConsumed = 20
BridgeError::PerRouteLimitExceeded = 21
BridgeError::AggregateWindowLimitExceeded = 22
BridgeError::LimitChangeUnauthorized = 23
BridgeError::TransferPermanentlyFailed = 24
BridgeError::TransferNotRetryable = 25
DataKey::DeploymentId
DataKey::ConsumedMessage(String)
DataKey::WithdrawalRouteConfig(ChainId, ChainId, String)
DataKey::WithdrawalWindow(ChainId, ChainId, String)
```

`def62b7c` *is* an ancestor of `HEAD` (`git merge-base --is-ancestor
def62b7c HEAD` succeeds), and its own commit is internally consistent —
building the tree at that commit alone would succeed. The very next
commit touching the file, **`d4499e70` "Merge branch 'main' into
fix/bridge-replay-safety-batch-hardening"**, merged `main` (which had
meanwhile, on a different branch, added `BridgeError::ContractPaused =
20` and `BridgeError::InvalidTokenMetadata = 21` for Issue #865/token
metadata) back into the feature branch. `git diff def62b7c d4499e70 --
.../bridge/src/lib.rs` shows the merge resolution kept *only* `main`'s
two new variants and **silently dropped all six of `def62b7c`'s** —
while keeping every function body, struct (`WithdrawalRouteConfig`,
`WithdrawalWindow` still exist as `#[contracttype]` structs — only their
`DataKey` enum variants are gone), and test that *uses* those variants.
This is a textbook "half the conflict resolved" merge: the conflicting
enum hunks were resolved by picking one side wholesale instead of
union-merging both sets of additions, but the surrounding code from both
branches was kept, so the tree now references identifiers that don't
exist. The full list of casualties, per the actual `cargo build -p
bridge` error output (9 identifiers, not 6 — an earlier pass at this
diagnosis undercounted by assuming `MessageAlreadyConsumed`,
`DeploymentId`, and `ConsumedMessage` survived; they didn't):
`BridgeError::{MessageAlreadyConsumed, PerRouteLimitExceeded,
AggregateWindowLimitExceeded, TransferPermanentlyFailed,
TransferNotRetryable}` and `DataKey::{DeploymentId, ConsumedMessage,
WithdrawalRouteConfig, WithdrawalWindow}`. `LimitChangeUnauthorized` was
dropped too but was never actually referenced anywhere even in
`def62b7c`'s own diff, so it caused no build error and doesn't need to
come back.

**Fix plan (own commit):** restore all nine dropped identifiers,
continuing `BridgeError` numbering from the current max
(`InvalidTokenMetadata = 21` → 22-26), plus the four `DataKey` variants
(no explicit discriminants needed — `DataKey` isn't `#[repr(u32)]`). Add
matching `message()` arms for the five restored `BridgeError` variants
(the `message()` match is exhaustive, no wildcard arm). No logic
changes — the function bodies that use these identifiers are already
correct and already tested (`contracts/bridge/src/lib.rs`'s `mod test`
has passing assertions like
`assert_eq!(result, Err(BridgeError::PerRouteLimitExceeded))` waiting
for the enum to exist again).

## Summary

| Crate | Root cause | Shared with |
|---|---|---|
| `stake_vault` | Missing `impl From<TokenFailure> for StakeVaultError` | `trade_executor` (same commit `4920ccfc`) |
| `trade_executor` | Missing `impl From<TokenFailure> for ContractError` | `stake_vault` (same commit `4920ccfc`) |
| `auto_trade` | `impl` present, but a new discriminant pushed the `#[contracterror]` enum past Soroban's 50-variant cap | Same commit `4920ccfc` as the above two, different failure mode |
| `bridge` | Bad merge (`d4499e70`) dropped 9 enum variants added by `def62b7c` while keeping the code that uses them | Unrelated to `4920ccfc`; different PR, same day |
| Deployment manifest | `user_portfolio`/`trade_executor` slots were given the wrong `package` value at manifest creation (`dd7f94ea`, 2026-07-24) | Unrelated to all of the above; five weeks earlier, never touched again |

**One bug or two? Three, really** — the manifest mismatch, the
incomplete Issue #1001 rollout (`stake_vault` + `trade_executor` +
`auto_trade`, one shared commit, two failure modes), and the `bridge`
bad merge are three independent incidents. They surfaced together only
because they involve the same four crate names and were all discovered
in the same audit pass.
