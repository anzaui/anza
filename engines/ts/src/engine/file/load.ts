import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { digest } from '../../crypto/index.js';
import { AnzaError } from '../../errors/index.js';
import { extract, compile, type Chunk, type Params, type CompiledRenderer } from '../slot/index.js';

/** Default cap on a template file's size: 1 MiB. */
export const DEFAULT_MAX_TEMPLATE_BYTES = 1024 * 1024;

/** How templates are loaded (from `Setup`). */
export interface LoadOptions {
  /** HTML-escape `{{slot}}` values; `{{{raw}}}` stays raw. */
  escape?: boolean;
  /** Refuse template files larger than this many bytes. Default 1 MiB. */
  maxBytes?: number;
}

export class Template {
  public renderer: CompiledRenderer;

  constructor(
    public name: string,
    public path: string,
    public raw: string,
    public digest: string,
    public chunks: Chunk[],
    options: LoadOptions = {}
  ) {
    this.renderer = compile(chunks, { escape: options.escape });
  }

  bind(params?: Params): string {
    return this.renderer(params);
  }

  render(params?: Params): string {
    return this.renderer(params);
  }
}

function inside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * Load one template. Errors name the template, never the full path: a file
 * that resolves (through a symlink) outside `rootDir`, or that is larger than
 * `maxBytes`, is refused.
 */
export async function one(rootDir: string, relPath: string, options: LoadOptions = {}): Promise<Template> {
  const name = relPath.split(path.sep).join('/').replace(/^\/+/, '');
  const fullPath = path.join(rootDir, relPath);
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_TEMPLATE_BYTES;
  let real: string;
  let realRoot: string;
  try {
    [real, realRoot] = await Promise.all([fs.realpath(fullPath), fs.realpath(rootDir)]);
  } catch (err: any) {
    throw AnzaError.notFound(`Failed to read template '${name}': ${err?.code ?? 'error'}`);
  }
  if (!inside(realRoot, real)) throw AnzaError.notFound(`Template '${name}' is outside the template root`);

  let handle: fs.FileHandle | undefined;
  let bytes: Buffer;
  try {
    handle = await fs.open(real, 'r');
    const buf = Buffer.alloc(maxBytes + 1);
    let total = 0;
    while (total < buf.length) {
      const { bytesRead } = await handle.read(buf, total, buf.length - total, total);
      if (bytesRead === 0) break;
      total += bytesRead;
    }
    bytes = buf.subarray(0, total);
  } catch (err: any) {
    throw AnzaError.notFound(`Failed to read template '${name}': ${err?.code ?? 'error'}`);
  } finally {
    await handle?.close();
  }
  if (bytes.length > maxBytes) throw AnzaError.template(`Template '${name}' is larger than ${maxBytes} bytes`);

  const raw = bytes.toString('utf8');
  return new Template(name, fullPath, raw, digest.hex(raw), extract(raw), options);
}

/**
 * Load every `.html` file under `rootDir`. Symlinked directories are not
 * followed, and symlinked files that resolve outside `rootDir` are skipped.
 */
export async function all(rootDir: string, options: LoadOptions = {}): Promise<Map<string, Template>> {
  const map = new Map<string, Template>();
  let realRoot: string;
  try {
    realRoot = await fs.realpath(rootDir);
  } catch {
    return map;
  }

  async function walk(currentDir: string) {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.name.endsWith('.html')) continue;
      if (entry.isSymbolicLink()) {
        const target = await fs.realpath(fullPath).catch(() => null);
        if (!target || !inside(realRoot, target)) continue;
        const stat = await fs.stat(target).catch(() => null);
        if (!stat?.isFile()) continue;
      } else if (!entry.isFile()) {
        continue;
      }
      const tpl = await one(rootDir, path.relative(rootDir, fullPath), options);
      map.set(tpl.name, tpl);
    }
  }

  await walk(rootDir);
  return map;
}
