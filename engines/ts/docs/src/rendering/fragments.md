# Dynamic Fragment Envelopes

Partial HTTP fetches and live streams emit the signed Anza `Envelope`.

## 1. The `Envelope` Interface & Class

Located in `src/models/envelope.ts`:

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
    public css?: string
  ) {}
}
```

- **`slot`**: Target DOM slot or container element ID.
- **`ts`**: Unix timestamp in seconds for freshness and replay defense.
- **`html`**: Rendered semantic HTML fragment.
- **`sig`**: Cryptographic signature computed over `${ts}:${slot}:${html}`.
- **`css`**: Optional dynamic stylesheet override scoped to the fragment.

## 2. Rendering a Fragment in TypeScript

```typescript
import { Fragment, jsonResponse } from 'anza';

const envelope = await new Fragment('feed/card.html', 'feed-slot', {
  title: 'New Event Received',
  status: 'processed',
}).run(engine);

console.log('Slot:', envelope.slot);
console.log('Timestamp:', envelope.ts);
console.log('Signature:', envelope.sig);

return jsonResponse(envelope);
```
