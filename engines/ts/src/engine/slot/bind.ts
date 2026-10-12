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

/**
 * Compile chunks into a renderer. The template is flattened once into
 * `statics[0] slot[0] statics[1] … slot[n-1] statics[n]`; a render does one
 * type check on `params`, then one lookup per slot.
 */
export function compile(chunks: Chunk[], options: CompileOptions = {}): CompiledRenderer {
  const escape = Boolean(options.escape);
  const statics: string[] = [''];
  const names: string[] = [];
  const escapes: boolean[] = [];
  for (const c of chunks) {
    if (c.type === 'static') {
      statics[statics.length - 1] += c.value;
    } else {
      names.push(c.name);
      escapes.push(escape && c.type === 'slot');
      statics.push('');
    }
  }
  const n = names.length;
  const anyEscape = escapes.includes(true);
  // Names an inherited `Object.prototype` member could answer; only these
  // need an own-property check on plain objects.
  const risky = names.map((name) => name === '__proto__' || name in Object.prototype);
  const text = anyEscape
    ? (val: unknown, i: number): string => {
        const s = typeof val === 'string' ? val : stringify(val);
        return s === undefined ? '' : escapes[i] ? escapeHtml(s) : s;
      }
    : (val: unknown): string => (typeof val === 'string' ? val : (stringify(val) ?? ''));

  return function render(params?: Params): string {
    let out = statics[0];
    if (!params) {
      for (let i = 0; i < n; i++) out += statics[i + 1];
      return out;
    }
    if (params instanceof Map) {
      for (let i = 0; i < n; i++) out += text(params.get(names[i]), i) + statics[i + 1];
      return out;
    }
    if (Array.isArray(params)) {
      // One pass over the pairs (first one wins), then one over the slots.
      const map = new Map<string, unknown>();
      for (let j = params.length - 1; j >= 0; j--) map.set(params[j][0], params[j][1]);
      for (let i = 0; i < n; i++) out += text(map.get(names[i]), i) + statics[i + 1];
      return out;
    }
    // Own properties only: `{{toString}}` or `{{__proto__}}` never reach the prototype.
    const obj = params as Record<string, unknown>;
    const proto = Object.getPrototypeOf(obj);
    const plain = proto === Object.prototype || proto === null;
    for (let i = 0; i < n; i++) {
      const name = names[i];
      const own = plain && !risky[i] ? true : hasOwn(obj, name);
      out += (own ? text(obj[name], i) : '') + statics[i + 1];
    }
    return out;
  };
}

export function string(chunks: Chunk[], params?: Params, options: CompileOptions = {}): string {
  return compile(chunks, options)(params);
}
