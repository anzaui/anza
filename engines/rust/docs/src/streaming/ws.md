# WebSocket Packetization

For bidirectional applications requiring uplink user events alongside downlink template streams, Anza formats envelopes into text frames.

## 1. The `Packet` Encoder

Located in `src/stream/ws/packet.rs`:

```rust
use anza::stream::ws::packet::format as format_ws_packet;
use anza::models::envelope::Envelope;

let envelope = Envelope {
  slot: "notifications".into(),
  ts: 1724771200,
  html: "<ui-toast>Order Shipped</ui-toast>".into(),
  sig: Some("3a9f...".into()),
  css: None,
};

let json_payload = format_ws_packet(&envelope)?;
// Transmit json_payload over WebSocket connection
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
