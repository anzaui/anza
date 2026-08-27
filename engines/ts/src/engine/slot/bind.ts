import type { Chunk } from './parse.js';

export type Params =
  | Record<string, any>
  | Map<string, any>
  | Array<[string, any]>
  | null
  | undefined;

export type CompiledRenderer = (params?: Params) => string;

/**
 * Creates a JIT-optimized closure for single-digit nanosecond rendering in V8 / JavaScript runtimes.
 */
export function compile(chunks: Chunk[]): CompiledRenderer {
  const parts: Array<{ type: 'static'; value: string } | { type: 'slot'; name: string }> = [];

  for (const chunk of chunks) {
    if (chunk.type === 'static') {
      if (chunk.value.length > 0) {
        parts.push({ type: 'static', value: chunk.value });
      }
    } else {
      parts.push({ type: 'slot', name: chunk.name });
    }
  }

  // Fast direct interpreter closure
  return function render(params?: Params): string {
    if (!params) {
      let out = '';
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p.type === 'static') out += p.value;
      }
      return out;
    }

    // Map lookup
    if (params instanceof Map) {
      let out = '';
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p.type === 'static') {
          out += p.value;
        } else {
          const val = params.get(p.name);
          if (val !== undefined && val !== null) out += val;
        }
      }
      return out;
    }

    // Array of key-value pairs
    if (Array.isArray(params)) {
      let out = '';
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p.type === 'static') {
          out += p.value;
        } else {
          for (let j = 0; j < params.length; j++) {
            if (params[j][0] === p.name) {
              const val = params[j][1];
              if (val !== undefined && val !== null) out += val;
              break;
            }
          }
        }
      }
      return out;
    }

    // Direct Object property lookup (V8 optimized hidden classes)
    let out = '';
    const obj = params as Record<string, any>;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.type === 'static') {
        out += p.value;
      } else {
        const val = obj[p.name];
        if (val !== undefined && val !== null) out += val;
      }
    }
    return out;
  };
}

export function string(chunks: Chunk[], params?: Params): string {
  const fn = compile(chunks);
  return fn(params);
}
