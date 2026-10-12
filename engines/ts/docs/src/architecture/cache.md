# Template Cache

Templates are loaded, hashed with SHA-256 and stored in a `Map` by `Setup.run()`.

## 1. `Template`

`src/engine/file/load.ts` (exported from `@anzaui/engine`):

```typescript
export class Template {
  public renderer: CompiledRenderer;

  constructor(
    public name: string,   // path relative to the root, e.g. 'pages/home.html'
    public path: string,   // path.join(root, name)
    public raw: string,    // file contents
    public digest: string, // hex SHA-256 of the contents
    public chunks: Chunk[],
    options: LoadOptions = {}, // { escape?, maxBytes? }
  ) {
    this.renderer = compile(chunks, { escape: options.escape });
  }

  bind(params?: Params): string;
  render(params?: Params): string; // same as bind
}
```

## 2. Store and engine

`src/engine/cache/store.ts` and `src/engine/cache/engine.ts`:

```typescript
class CacheStore {
  constructor(public templates: Map<string, Template> = new Map()) {}
  get(name: string): Template; // VALIDATION for a malformed name, NOT_FOUND if missing
  insert(name: string, template: Template): void;
  remove(name: string): boolean;
  has(name: string): boolean;
}

class Engine {
  readonly signer: Signer;               // validated key, never printed
  readonly fragments: readonly string[]; // fragment allowlist

  constructor(
    public root: string,
    public cache: CacheStore,
    signing: SignOptions | Signer = { mode: 'none' },
    public watcher?: FileWatcher,
    options: EngineOptions = {},          // { fragments? }
  ) {}
}
```

`CacheStore` is not exported from the package root; get an `Engine` from
`new Setup(...).run()`.

### Lookup

`engine.get(name)` is a `Map.get`; it never reads the filesystem. It throws an
`AnzaError` with code `VALIDATION` for a malformed name and `NOT_FOUND` if the
template does not exist:

```typescript
const tpl = engine.get('feed/card.html');
const html = tpl.bind({ title: 'Live Update' });
```

## 3. Manifest

`engine.manifest()` returns a `Manifest` whose `templates` field maps each
template name to its hex SHA-256 digest:

```typescript
const manifest = engine.manifest();
for (const [name, digest] of Object.entries(manifest.templates)) {
  console.log(`${name} -> ${digest.slice(0, 12)}`);
}
```

The Rust and Python engines also use SHA-256 in lowercase hex, so manifests
match across engines for the same files.
