#!/usr/bin/env bash
# Wrapper: Soroban workspace lives under call-stake/.
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../call-stake/scripts/build.sh" "$@"
