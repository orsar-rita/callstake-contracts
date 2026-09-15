# Rebrand map: StellarSwipe -> CallStake, AgesEmpire removal

This document is the single source of truth for the rebrand carried out
across the commits that follow it. It records the exact substitution
rules used, what was deliberately left untouched and why, and every
judgment call made along the way.

## 1. Brand rename rules

The repo was audited for every casing/separator variant of the brand
name actually present (`git grep -hoE '[Ss]tellar[ _-]?[Ss]wipe'` across
all tracked files, deduplicated). Exactly six forms exist — no
`stellarSwipe` camelCase or `STELLAR_SWIPE` all-caps-snake form appears
anywhere in the repo. Each is replaced with the matching case/separator
convention on the new name:

| Find | Replace |
|---|---|
| `StellarSwipe` | `CallStake` |
| `stellarswipe` | `callstake` |
| `STELLARSWIPE` | `CALLSTAKE` |
| `Stellar Swipe` | `Call Stake` |
| `stellar-swipe` | `call-stake` |
| `stellar_swipe` | `call_stake` |

These are applied as plain substring replacements (not whole-word),
which is intentional: it's what correctly handles compound identifiers
that embed the brand, e.g. `stellar_swipe_common` -> `call_stake_common`,
or a placeholder domain like `stellarswipe.io` -> `callstake.io`. Because
the six forms are mutually exclusive exact strings (they differ in case
and/or separator), the order the substitutions run in does not matter.

Verified before touching anything: there is no bare "Swipe" used
anywhere in the repo as a standalone shorthand for the product — every
occurrence of "swipe" (any case) is part of one of the six compound
forms above. So there is no separate "did they mean just the word Swipe"
judgment call to make.

## 2. AgesEmpire removal rule

Every case/separator form of "AgesEmpire" is removed, with no
replacement org name (there is no org anymore). The repo-wide audit
(`git grep -liE 'ages[ _-]?empire'`) found exactly 4 files, all
referencing the org only as a GitHub URL owner or a copyright holder —
no CI secrets, npm scope, Docker registry path, CODEOWNERS, or FUNDING
file exist in this repo to worry about:

- `LICENSE` — copyright line `Copyright (c) 2026 AgesEmpire`
- `SECURITY.md` — a security-advisories URL under `github.com/AgesEmpire/...`
- `docs/security/researcher_resources.md` — a `git clone` URL under the same org
- `docs/security/responsible_disclosure_process.md` — the same advisories URL pattern

Per the task instructions, repo URLs of the form
`github.com/AgesEmpire/StellarSwipe-Contract` become a bare,
org-less placeholder — `github.com/TODO-OWNER/CallStake-Contract` — and
the copyright line becomes `Copyright (c) 2026 TODO-OWNER`. No username
or org is invented. Every placeholder uses the literal token
`TODO-OWNER` so a single `grep -rn TODO-OWNER` finds all of them later.

There are no `Cargo.toml` "authors"/"repository" fields and no
`package.json` "author"/"repository" fields anywhere in this repo
(checked explicitly) — so there is nothing to placeholder there.

## 3. Explicitly out of scope — left untouched

- **Bare "Stellar"** referring to the blockchain/network/protocol/SDK:
  Stellar network, Soroban, Horizon, `@stellar/stellar-sdk`,
  `@stellar/freighter-api`, `horizon-testnet.stellar.org`,
  `soroban-testnet.stellar.org`, the network passphrase string
  `"Test SDF Network ; September 2015"`, and any import from the
  `@stellar` npm scope. None of these ever appear adjacent to "Swipe",
  so the substring rules above cannot accidentally touch them, and no
  file needed a "which Stellar do you mean here" judgment call.
- **`frontend/node_modules/`** — tracked in git (see note below) but
  vendored/generated content; per the task's explicit exclusion list
  this is not touched even though `.package-lock.json` inside it
  contains a brand string. Separately worth flagging: `frontend/`'s own
  `.gitignore` lists `node_modules`, yet `git ls-files` shows over
  10,000 files under `frontend/node_modules/` are actually tracked.
  That's a pre-existing repo-hygiene problem unrelated to this rebrand
  and is not addressed here.
- **Lockfile entries for third-party packages** — `@stellar/*`,
  `soroban-sdk`, etc. keep their real upstream names/versions in
  `Cargo.lock`/`package-lock.json`. Only the *first-party* package name
  fields (this project's own `name` in `package.json` /
  `package-lock.json` / crate `Cargo.toml`) are renamed.
- **No Docker, Kubernetes, or Terraform files exist in this repo** — the
  suggested plan's steps about container registries, k8s manifests, and
  Terraform resources don't apply; there is nothing under those
  categories to change.
- **No backend codebase exists in this repo** (confirmed in the prior
  cleanup session and re-confirmed here) — steps about a NestJS
  backend, `.env.example`, Sentry project names, JWT issuers, etc. don't
  apply for the same reason.
- **On-chain contract IDs/addresses** in `deployments/*.json` and
  `config/*.json` are historical facts about already-deployed contracts
  and are never altered by a rebrand. Only human-readable labels/names
  in those files are renamed.
- **Historical git commit messages and merged PR titles** are not
  rewritten — history stays as it is; only file contents from here
  forward change.

## 4. Ambiguous cases flagged for a human

- `stellar-swipe/SECURITY.md` (a governance-timelock architecture note,
  not actually a security policy, misnamed since before this rebrand —
  see the prior cleanup's status report) contains no brand or org
  string itself, so nothing to rename there, but is worth remembering
  it exists alongside the real root `SECURITY.md` once the rename
  lands.
- `docs/security/pgp-key.asc` is explicitly a placeholder/instructions
  file, not a real PGP key (its own first line says so). Its example
  email/domain (`security@stellarswipe.io`) is renamed to
  `security@callstake.io` like any other placeholder text — this is
  not a real, registered domain, so no "don't guess an identity" concern
  applies the way it does for the AgesEmpire copyright line.
- The `stellar-swipe/` directory itself is being renamed to
  `call-stake/`. This is a path, not just text, so it needs `git mv`
  plus every path reference to it (CI workflow `working-directory`
  values, `cd stellar-swipe` shell lines, scaffold script paths,
  `deny.toml --manifest-path`, doc links) updated in the same commit as
  the move so the repo stays buildable.
- `stellar_swipe_common` is the *only* contract crate whose Cargo
  package name embeds the brand (all 13 other crates already have
  brand-neutral names like `bridge`, `stake_vault`, `signal_registry`).
  It becomes `call_stake_common`; every `path = "../common"` dependency
  alias referencing it, and every `use stellar_swipe_common::...` in
  source, is updated in the same commit, followed immediately by a
  `cargo build`/`cargo test` verification and a regenerated
  `Cargo.lock`.
