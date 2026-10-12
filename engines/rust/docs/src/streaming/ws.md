# WebSocket Frames

For WebSockets, send the envelope JSON as a text message.

## 1. Encoding

`src/stream/ws/packet.rs`:

```rust
use anza::{stream::ws, Envelope};

let envelope = Envelope::new("notifications", 1_724_771_200, "<ui-toast>Order Shipped</ui-toast>");

let text: String = ws::encode(&envelope);
// send `text` as a WebSocket text message with your framework
```

## 2. Receiving in the browser

The Anza browser library has no WebSocket envelope handler, so this is your code.
If the envelopes are signed and you want to check them in the browser, see
[Ed25519](../crypto/ed25519.md#4-verifying-in-the-browser-your-code). Remember
that the engine escapes values in `html` only when `escape` is on.

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
