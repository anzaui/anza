#!/usr/bin/env bash
set -euo pipefail

echo "=== Cloudflare Pages Build ==="

# 1. Install Rust (if not cached)
if ! command -v cargo &>/dev/null; then
  echo "Installing Rust..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
  source "$HOME/.cargo/env"
fi

echo "Rust: $(rustc --version)"

# 2. Build anza CLI from Rust
echo "Building anza CLI..."
cd tools
cargo build --release
cd ..

export PATH="$(pwd)/tools/target/release:$PATH"
echo "Anza: $(which anza)"

# 3. Build web assets
echo "Building web assets..."
cd web
npm install
anza build

echo "=== Build complete ==="
ls -la dist/
