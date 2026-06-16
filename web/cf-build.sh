#!/usr/bin/env bash
set -euo pipefail

echo "=== Cloudflare Pages Build ==="

echo "Installing dependencies..."
npm install

echo "Building web project..."
npm run build

echo "=== Build complete ==="
echo "Output: dist/"
ls -la dist/
