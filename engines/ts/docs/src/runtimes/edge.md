# Edge Runtimes (Cloudflare Workers and similar)

Edge runtimes are **not supported** today:

- `Setup.run()` loads templates from the filesystem with `node:fs`, which edge
  isolates do not provide.
- `CacheStore` (needed to construct an `Engine` by hand) is not exported from the
  package.
- Digests and signatures use `node:crypto`, not `crypto.subtle`. Some platforms
  offer it behind a Node compatibility flag, but this is untested.

What does work without a filesystem is the template core: `extract` and
`compile` only use plain JavaScript.

```typescript
import { compile, extract } from '@anzaui/engine';

const render = compile(extract('<ui-card>{{title}}</ui-card>'));
const html = render({ title: 'Rendered at the edge' }); // not escaped
```

Wrapping the result in an envelope and signing it then needs your own code
(for example `crypto.subtle` HMAC over `${ts}:${slot}:${html}`).
