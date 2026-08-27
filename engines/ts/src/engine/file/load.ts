import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { digest } from '../../crypto/index.js';
import { extract, compile, type Chunk, type Params, type CompiledRenderer } from '../slot/index.js';
import { text } from './read.js';

export class Template {
  public renderer: CompiledRenderer;

  constructor(
    public name: string,
    public path: string,
    public raw: string,
    public digest: string,
    public chunks: Chunk[]
  ) {
    this.renderer = compile(chunks);
  }

  bind(params?: Params): string {
    return this.renderer(params);
  }

  render(params?: Params): string {
    return this.renderer(params);
  }
}

export async function one(rootDir: string, relPath: string): Promise<Template> {
  const fullPath = path.join(rootDir, relPath);
  const raw = await text(fullPath);
  const hashHex = digest.hex(raw);
  const chunks = extract(raw);
  const normalizedName = relPath.replace(/\\/g, '/').replace(/^\//, '');

  return new Template(normalizedName, fullPath, raw, hashHex, chunks);
}

export async function all(rootDir: string): Promise<Map<string, Template>> {
  const map = new Map<string, Template>();

  async function walk(currentDir: string, baseDir: string) {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, baseDir);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        const relPath = path.relative(baseDir, fullPath);
        const tpl = await one(baseDir, relPath);
        map.set(tpl.name, tpl);
      }
    }
  }

  await walk(rootDir, rootDir);
  return map;
}
