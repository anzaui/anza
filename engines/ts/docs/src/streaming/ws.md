# WebSocket Packetization

For bidirectional applications requiring uplink user events alongside downlink template streams, Anza formats envelopes into text frames.

## 1. The `formatPacket` Helper

Located in `src/stream/ws.ts`:

```typescript
import { formatPacket } from 'anza';
import { Envelope } from 'anza';

const envelope = new Envelope(
  'notifications',
  1724771200,
  '<ui-toast>Order Shipped</ui-toast>',
  '3a9f...'
);

const jsonPayload = formatPacket(envelope);
// Transmit jsonPayload over ws.send(jsonPayload)
```

## 2. Client-Side WebSocket Reception

When receiving a WebSocket frame:

```javascript
ws.onmessage = async (event) => {
  const envelope = JSON.parse(event.data);
  
  // 1. Verify signature
  const valid = await verifyEnvelope(envelope);
  if (!valid) {
    console.error("Tampered WebSocket envelope rejected");
    return;
  }

  // 2. Locate target dock slot and replace content
  const targetSlot = document.querySelector(`[data-slot="${envelope.slot}"]`);
  if (targetSlot) {
    targetSlot.innerHTML = envelope.html;
  }
};
```
