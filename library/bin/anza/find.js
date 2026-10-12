/**
 * bin/anza/find.js
 *
 * Resolves the anza Rust binary path for the current platform.
 */

import { join } from 'path';
import { existsSync } from 'fs';

const PLATFORMS = {
  darwin: { x64: 'anza-macos-x64', arm64: 'anza-macos-arm64' },
  linux:  { x64: 'anza-linux-x64', arm64: 'anza-linux-arm64' },
  win32:  { x64: 'anza-windows-x64.exe', arm64: 'anza-windows-arm64.exe' },
};

export function resolve(root, here) {
  const dev = join(root, 'target', 'release', 'anza');
  if (existsSync(dev)) return dev;

  const platform = process.platform;
  const arch = process.arch;
  const name = PLATFORMS[platform]?.[arch];

  if (!name) {
    throw new Error(`Unsupported platform: ${platform} ${arch}`);
  }

  const prebuilt = join(here, name);
  if (existsSync(prebuilt)) return prebuilt;

  throw new Error(
    'anza binary not found.\n' +
    'Run: node tasks/build.js  (from the repo root)'
  );
}
