#!/usr/bin/env bash
set -euo pipefail

echo "=== Cloudflare Pages Build ==="

# Extract version from library/package.json
VERSION=$(jq -r .version library/package.json)
echo "Anza version: v${VERSION}"

# Download prebuilt binary from GitHub release
BINARY="anza-linux-x64"
URL="https://github.com/aduki-org/anza/releases/download/v${VERSION}/${BINARY}"

echo "Downloading ${BINARY}..."
curl -fsSL -o anza "${URL}"
chmod +x anza
export PATH="$(pwd):$PATH"

echo "Binary: $(./anza --version 2>/dev/null || echo 'ok')"

# Build web assets
echo "Building web assets.."
cd web
npm install
anza build

echo "=== Build complete ==="
ls -la dist/
