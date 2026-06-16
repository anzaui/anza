#!/usr/bin/env bash
set -euo pipefail

echo "=== Cloudflare Pages Build ==="

cd web

echo "Installing dependencies..."
npm install

echo "Building web project..."
npm run build

echo "=== Build complete ==="
echo "Output: web/dist/"
ls -la dist/
