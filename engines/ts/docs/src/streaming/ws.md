# WebSocket Frames

For WebSockets, send the envelope JSON as a text message.

## 1. Encoding

`src/stream/ws.ts`:

```typescript
import { Envelope, formatPacket } from '@anzaui/engine';

const envelope = new Envelope('notifications', 1724771200, '<ui-toast>Order Shipped</ui-toast>');

const text = formatPacket(envelope); // '{"v":2,"slot":"notifications",…}'
// socket.send(text) with your WebSocket library
```

## 2. Receiving in the browser

The Anza browser library has no WebSocket envelope handler, so this is your code.
If the envelopes are signed and you want to check them in the browser, see
[Ed25519 Signing](../crypto/ed25519.md#4-verifying-in-the-browser-your-code).
Remember that `html` is only escaped where the engine runs with `escape: true`.

```javascript
ws.onmessage = async (event) => {
  const envelope = JSON.parse(event.data);

  if (!(await verifyEnvelope(envelope, publicKeyBytes, 'notifications'))) {
    console.error('Rejected envelope');
    return;
  }

  const target = document.querySelector(`[data-slot="${envelope.slot}"]`);
  if (target) target.innerHTML = envelope.html;
};
```
