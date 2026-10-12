# Fragment Envelopes

Fragments and pushes return an `Envelope`.

## 1. `Envelope`

`src/models/envelope.ts`:

```typescript
export interface EnvelopeData {
  slot: string;
  ts: number;
  html: string;
  sig?: string;
  css?: string;
}

export class Envelope implements EnvelopeData {
  constructor(
    public slot: string,
    public ts: number,
    public html: string,
    public sig?: string,
    public css?: string,
  ) {}

  message(): string;       // `${ts}:${slot}:${html}`, the signed string
  toJSON(): EnvelopeData;  // omits sig / css when empty
}
```

- **`slot`**: the target name you chose when rendering.
- **`ts`**: Unix time in seconds when the envelope was rendered.
- **`html`**: the bound fragment HTML (not escaped).
- **`sig`**: hex signature over `${ts}:${slot}:${html}`, present for `hmac` and `ed25519` signing.
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

`engine.renderFragment` looks up the template, binds the params, takes the
current time, signs `ts:slot:html` according to `engine.signing`, and returns the
envelope.
