# Fragment Envelopes

Fragments and pushes return an `Envelope`.

## 1. `Envelope`

`src/models/envelope.ts`:

```typescript
export interface EnvelopeData {
  v: number; // always 2
  slot: string;
  ts: number;
  html: string;
  sig?: string;
  css?: string;
}

export class Envelope implements EnvelopeData {
  readonly v = 2;

  constructor(
    public slot: string,
    public ts: number,
    public html: string,
    public sig?: string,
    public css?: string,
  ) {}

  message(): Buffer;       // the v2 bytes the signature covers
  toJSON(): EnvelopeData;  // v first; omits sig / css when undefined
}
```

- **`v`**: wire-format version, always `2`, serialized first.
- **`slot`**: the target name you chose when rendering.
- **`ts`**: Unix time in seconds when the envelope was rendered.
- **`html`**: the bound fragment HTML (escaped only where `escape: true` applies).
- **`sig`**: lowercase hex signature over the v2 message (`signatureMessage(ts, slot, html, css)`), present for `hmac` and `ed25519` signing.
- **`css`**: optional CSS text; the engine never sets it.

## 2. Rendering a fragment

```typescript
import { Fragment, jsonResponse } from '@anzaui/engine';

const envelope = await new Fragment('feed/card.html', 'feed-slot', {
  title: 'New Event Received',
  status: 'processed',
}).run(engine);

console.log('slot:', envelope.slot);
console.log('ts:', envelope.ts);
console.log('sig:', envelope.sig);

const response = jsonResponse(envelope);
```

`engine.renderFragment` looks up the template, checks the `fragments`
allowlist, binds the params, takes the current time, signs the v2 message with
`engine.signer`, and returns the envelope. `JSON.stringify(envelope)` gives
`{"v":2,"slot":"feed-slot","ts":…,"html":"…","sig":"…"}`.

## 3. Fragment allowlist

By default any cached template can be rendered as a fragment. The `fragments`
setup option limits that. An entry ending in `/` allows that prefix; any other
entry allows that exact name:

```typescript
const engine = await new Setup({
  root: './templates',
  fragments: ['feed/', 'widgets/clock.html'],
}).run();

await engine.renderFragment('feed/card.html', 'feed');   // allowed
await engine.renderFragment('layout/shell.html', 'feed'); // NOT_FOUND
```

A template outside the allowlist is reported as `Template '<name>' not found`,
the same as a missing one. `fragmentAllowed(list, name)` exposes the same check.
