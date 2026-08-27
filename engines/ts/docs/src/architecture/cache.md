# Template Caching & Store

Templates are loaded, hashed with SHA-256, and indexed in an in-memory `Map` at server initialization.

## 1. The `Template` Class

Located in `src/engine/file/load.ts`:

```typescript
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
```

## 2. In-Memory Cache Store and Engine

Located in `src/engine/cache/store.ts` and `src/engine/cache/engine.ts`:

```typescript
export class CacheStore {
  constructor(public templates: Map<string, Template> = new Map()) {}

  get(name: string): Template {
    const tpl = this.templates.get(name);
    if (!tpl) {
      throw AnzaError.notFound(`Template '${name}' not found in cache`);
    }
    return tpl;
  }
}
```

### Template Lookup

Template lookup is an $O(1)$ `Map.get()` operation with instant dispatch:

```typescript
const tpl = engine.get('feed/card.html');
const html = tpl.bind({ title: 'Live Update' });
```

## 3. Template Manifest & Digest Auditing

The engine provides a `Manifest` containing SHA-256 hashes of all loaded templates:

```typescript
const manifest = engine.manifest();
for (const [name, digest] of Object.entries(manifest.templates)) {
  console.log(`Template: ${name} -> SHA-256: ${digest.slice(0, 12)}`);
}
```
