#!/usr/bin/env bash
# Build a site twice from scratch and fail if dist/ differs (B10).
#
# Usage: tools/scripts/check-deterministic.sh [site-dir] [anza-binary]
# Defaults: web/ and target/debug/anza (relative to the repo root).
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
site="${1:-$root/web}"
anza="${2:-$root/target/debug/anza}"
first="$(mktemp -d)"
trap 'rm -rf "$first"' EXIT

cd "$site"
rm -rf dist .anzacache.json
"$anza" build >/dev/null
cp -a dist "$first/dist"
rm -rf dist .anzacache.json
"$anza" build >/dev/null

if diff -r "$first/dist" dist >/dev/null; then
  echo "deterministic: $(find dist -type f | wc -l) files identical"
else
  diff -rq "$first/dist" dist | head -20
  echo "dist differs between two builds" >&2
  exit 1
fi
