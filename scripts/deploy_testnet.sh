#!/usr/bin/env bash
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../call-stake/scripts/deploy_testnet.sh" "$@"
