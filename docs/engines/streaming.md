# Real-Time STUI Streaming

Server-Sent Events (SSE) and WebSockets enable Anza backends to push live, cryptographically signed UI updates directly into browser shadow roots.

## Server-Sent Events Protocol

Every template update is transmitted as an atomic event frame:

```http
event: template
data: {"slot":"feed","ts":1724771200,"html":"<article>Live Update</article>","sig":"a3f9..."}

```

1. **`event: template`**: Identifies that the event payload is an Anza STUI envelope.
2. **`data: { ... }`**: JSON-serialized `Envelope` model.
3. **Double Newline `\n\n`**: Standard SSE frame boundary.

## Client-Side Reception & Shadow Root Adoption

The browser client verifies the signature and swaps the content seamlessly:

```javascript
import { listenStream } from '@anzaui/anza/ui';

// Connect to real-time feed
const eventSource = new EventSource('/feed/stream');

eventSource.addEventListener('template', async (event) => {
  const envelope = JSON.parse(event.data);

  // 1. Locate target dock slot in the DOM
  const dock = document.querySelector(`dock-${envelope.slot}, [data-slot="${envelope.slot}"]`);
  if (dock) {
    // 2. Adopt updated template fragment
    dock.innerHTML = envelope.html;
  }
});
```
