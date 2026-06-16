#!/usr/bin/env bash
set -euo pipefail

echo "=== Cloudflare Pages Build ==="

# Download anza CLI binary from GitHub release
VERSION="0.4.3"
BINARY="anza-linux-x64"
URL="https://github.com/aduki-org/anza/releases/download/v${VERSION}/${BINARY}"

echo "Downloading anza v${VERSION}..."
curl -fsSL -o anza "${URL}"
chmod +x anza
export PATH="$(pwd):$PATH"

echo "Anza version: $(./anza --version 2>/dev/null || echo 'unknown')"

echo "Installing dependencies..."
npm install

echo "Building web project..."
npm run build

echo "=== Build complete ==="
echo "Output: dist/"
ls -la dist/
