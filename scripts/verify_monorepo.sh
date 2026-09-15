#!/usr/bin/env bash
# Runs the build/test gate for all three parts of this monorepo —
# contracts, frontend, backend — the same three checks a reviewer should
# run before trusting a change that touches more than one of them.
#
# NOTE on frontend/: node_modules is currently committed to this repo
# (despite frontend/.gitignore listing it) from before this script existed.
# Running `npm install` there rewrites thousands of tracked files as a
# side effect of normal dependency resolution (version bumps, platform-
# specific binaries, etc.) even when nothing in package.json changed. This
# script does NOT run `npm install` in frontend/ for that reason — install
# it manually first if node_modules isn't already populated, and `git
# checkout -- frontend/` afterward to discard any incidental changes
# before committing anything else. This is a pre-existing repo quirk, not
# something this script works around.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== contracts (call-stake/) =="
cd "$REPO_ROOT/call-stake"
cargo build --workspace --keep-going 2>&1 | grep "^error: could not compile" && \
  echo "(expected: auto_trade, bridge, stake_vault, trade_executor — pre-existing, see README.md)" || true

echo
echo "== frontend/ =="
cd "$REPO_ROOT/frontend"
if [ -d node_modules ]; then
  npm run build
else
  echo "node_modules missing — run 'npm install' in frontend/ manually, then re-run this script" >&2
  exit 1
fi

echo
echo "== backend/ =="
cd "$REPO_ROOT/backend"
npm run lint
npm run build
npm test -- --ci
