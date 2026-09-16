#!/usr/bin/env python3
"""
check_workspace_integrity.py — regression guard for two specific classes of
bug that have each cost a full audit pass to catch by hand:

  1. A Cargo workspace member that does not build. `cargo check
     --workspace` normally surfaces this, but this repo's CI runs
     `cargo clippy --workspace` / `cargo test --workspace` without
     `--keep-going`, so one broken crate can be masked by build-order
     luck or a narrower `-p` invocation in a dev loop, and a crate can
     silently stay broken across several work sessions.
  2. A deployment manifest (`deployments/*.manifest.json`) whose
     `"package"` field for a logical contract either isn't a real Cargo
     workspace member, or is a real member that isn't the one you'd
     expect — i.e. a logical contract's slot quietly deploying a
     different contract's package. See docs/CONTRACT_BUILD_DIAGNOSIS.md
     for the incident this guards against: `user_portfolio` pointed at
     `auto_trade` and `trade_executor` pointed at `bridge` for five
     weeks before anyone noticed, because every address was still null
     so nothing ever failed at runtime.

By convention in this workspace every logical contract name in a
manifest is expected to equal its `package` name (see every entry in
deployments/testnet.manifest.json). An entry that intentionally deploys
a different package under a logical name must say so explicitly with an
`"intentional_alias"` string field naming the reason; that is the only
way to silence check 2 for a given entry, so a future mismatch can never
pass by omission the way this one did.

Usage:
    python3 scripts/check_workspace_integrity.py

Exit codes:
    0  Every workspace member builds, and every manifest entry's package
       is a real member matching its logical name (or explicitly aliased).
    1  One or more problems found; all are printed together.
"""

import json
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
WORKSPACE_ROOT = SCRIPT_DIR.parent  # call-stake/
REPO_ROOT = WORKSPACE_ROOT.parent
DEPLOYMENTS_DIR = REPO_ROOT / "deployments"


def get_workspace_members() -> dict:
    """Return {package_name: manifest_path} for every workspace member,
    via `cargo metadata` so this never has to hand-parse Cargo.toml."""
    try:
        out = subprocess.run(
            ["cargo", "metadata", "--no-deps", "--format-version", "1"],
            cwd=WORKSPACE_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
    except subprocess.CalledProcessError as e:
        print(f"error: `cargo metadata` failed:\n{e.stderr}", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print("error: cargo not found on PATH", file=sys.stderr)
        sys.exit(1)

    data = json.loads(out.stdout)
    return {pkg["name"]: pkg["manifest_path"] for pkg in data["packages"]}


def check_all_members_build(members: dict) -> list:
    """Build every workspace member with --keep-going so one broken crate
    doesn't hide problems in (or successes of) the others, and return the
    list of package names that failed to compile."""
    print(f"==> building all {len(members)} workspace members (cargo build --workspace --keep-going)")
    result = subprocess.run(
        ["cargo", "build", "--workspace", "--keep-going"],
        cwd=WORKSPACE_ROOT,
        capture_output=True,
        text=True,
    )
    failed = []
    for line in result.stderr.splitlines():
        line = line.strip()
        if line.startswith("error: could not compile `"):
            # error: could not compile `crate_name` (lib) due to N previous errors
            name = line.split("`", 2)[1]
            failed.append(name)
    if result.returncode != 0 and not failed:
        # Build failed for a reason other than a per-crate compile error
        # (e.g. a workspace-level Cargo.toml problem) — surface it raw.
        print(result.stderr, file=sys.stderr)
        failed.append("<workspace: see raw cargo output above>")
    return failed


def check_manifest_packages(members: dict) -> list:
    """For every deployments/*.manifest.json, verify each contract entry's
    `package` is a real workspace member and matches its logical name
    (dict key) unless explicitly aliased."""
    errors = []
    manifest_paths = sorted(DEPLOYMENTS_DIR.glob("*.manifest.json"))
    if not manifest_paths:
        print(f"==> no deployment manifests found under {DEPLOYMENTS_DIR} — skipping manifest package check")
        return errors

    for path in manifest_paths:
        try:
            data = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError) as e:
            errors.append(f"{path}: could not read/parse as JSON: {e}")
            continue

        contracts = data.get("contracts")
        if not isinstance(contracts, dict):
            continue  # already reported by validate_deployment_manifest.py

        for logical_name, entry in contracts.items():
            if not isinstance(entry, dict):
                continue
            package = entry.get("package")
            if not isinstance(package, str) or not package:
                continue  # already reported by validate_deployment_manifest.py

            if package not in members:
                errors.append(
                    f"{path}: contracts.{logical_name}.package = {package!r} "
                    f"is not a real Cargo workspace member "
                    f"(known members: {', '.join(sorted(members))})"
                )
                continue

            if package != logical_name and "intentional_alias" not in entry:
                errors.append(
                    f"{path}: contracts.{logical_name}.package = {package!r} does not "
                    f"match its logical name {logical_name!r} — this is exactly the "
                    f"bug class this check exists to catch (see "
                    f"docs/CONTRACT_BUILD_DIAGNOSIS.md). If '{logical_name}' "
                    f"deploying the '{package}' package is genuinely intentional, "
                    f"add an \"intentional_alias\": \"<reason>\" field to this "
                    f"manifest entry to document why and silence this check."
                )
    return errors


def main() -> int:
    members = get_workspace_members()
    print(f"==> {len(members)} workspace members: {', '.join(sorted(members))}")

    problems = []

    failed_builds = check_all_members_build(members)
    if failed_builds:
        problems.append(
            "workspace members that failed to build: " + ", ".join(sorted(failed_builds))
        )
    else:
        print(f"==> all {len(members)} workspace members build cleanly")

    manifest_errors = check_manifest_packages(members)
    problems.extend(manifest_errors)

    if problems:
        print(f"\nFAIL — {len(problems)} problem(s):", file=sys.stderr)
        for p in problems:
            print(f"    - {p}", file=sys.stderr)
        return 1

    print("\nRESULT: workspace builds clean and every manifest package mapping checks out.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
