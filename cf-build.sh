#!/usr/bin/env bash
set -euo pipefail

echo "=== Cloudflare Pages Build ==="

# 1. Build anza CLI from Rust
echo "Building anza CLI..."
cd tools
cargo build --release
cd ..

export PATH="$(pwd)/tools/target/release:$PATH"
echo "Anza: $(which anza)"

# 2. Build web assets
echo "Building web assets..."
cd web
npm install
anza build

echo "=== Build complete ==="
ls -la dist/
