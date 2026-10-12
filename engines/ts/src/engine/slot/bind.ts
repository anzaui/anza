import type { Chunk } from './parse.js';
import { escapeHtml } from './escape.js';

export type Params =
  | Record<string, any>
  | Map<string, any>
  | Array<[string, any]>
  | null
  | undefined;

export type CompiledRenderer = (params?: Params) => string;

export interface CompileOptions {
  /** HTML-escape `{{slot}}` values; `{{{raw}}}` stays raw. Default `false`. */
  escape?: boolean;
}

const hasOwn = Object.hasOwn;

function lookup(params: Params, name: string): unknown {
  if (!params) return undefined;
  if (params instanceof Map) return params.get(name);
  if (Array.isArray(params)) {
    for (let j = 0; j < params.length; j++) {
      if (params[j][0] === name) return params[j][1];
    }
    return undefined;
  }
  // Own properties only: `{{toString}}` or `{{__proto__}}` never reach the prototype.
  return hasOwn(params, name) ? (params as Record<string, unknown>)[name] : undefined;
}

/**
 * A value as slot text (see `docs/engines/contract.md`): strings as-is,
 * `true`/`false`, numbers via `String()` (integral floats have no `.0`),
 * `null`/`undefined` as nothing, plain objects and arrays as compact JSON,
 * anything else via `String()`.
 */
export function stringify(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    const proto = Object.getPrototypeOf(val);
    if (Array.isArray(val) || proto === Object.prototype || proto === null) return JSON.stringify(val);
  }
  return String(val);
}

/** Compile chunks into a renderer. */
export function compile(chunks: Chunk[], options: CompileOptions = {}): CompiledRenderer {
  const escape = Boolean(options.escape);
  const parts = chunks.filter((c) => c.type !== 'static' || c.value.length > 0);

  return function render(params?: Params): string {
    let out = '';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.type === 'static') {
        out += p.value;
        continue;
      }
      const text = stringify(lookup(params, p.name));
      if (text === undefined) continue;
      out += escape && p.type === 'slot' ? escapeHtml(text) : text;
    }
    return out;
  };
}

export function string(chunks: Chunk[], params?: Params, options: CompileOptions = {}): string {
  return compile(chunks, options)(params);
}
