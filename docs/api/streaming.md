# Streaming

The API client parses NDJSON (newline-delimited JSON) streams natively using the Streams API, yielding parsed objects as an async iterable while preserving backpressure.

---

## Basic Streaming

```javascript
import { api } from '@anzaui/anza/api';

for await (const chunk of api.stream('/logs/stream')) {
  console.log(chunk.timestamp, chunk.message);
}
```

Each yielded value is a parsed JSON object. The stream is read via `TextDecoderStream` and `TransformStream` pipelines.

---

## Stream Options

```javascript
for await (const chunk of api.stream('/ai/generate', {
  method: 'POST',
  body: { prompt: 'Hello' },
  signal: controller.signal,
  on: {
    chunk: (event) => console.log('Received chunk', event.detail.chunk),
    error: (event) => console.error('Stream error', event.detail.error)
  }
})) {
  appendToDOM(chunk.text);
}
```

| Option | Description |
| -------- | ------------- |
| `method` | HTTP method (default `GET`) |
| `body` | Request body (auto-serialized for objects) |
| `signal` | AbortSignal for cancellation |
| `on` | Per-request event listeners |

---

## NDJSON Transform

For direct stream manipulation, the NDJSON transform stream is exported:

```javascript
import { createNDJSONTransform } from '@anzaui/anza/api';

const response = await fetch('/stream');
const reader = response.body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(createNDJSONTransform())
  .getReader();

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  console.log(value); // parsed JSON object
}
```

The transform handles partial lines across chunk boundaries and parses each complete line as JSON.

---

## Chunk Events

Every parsed chunk emits a `chunk` event on the telemetry bus:

```javascript
api.on('chunk', (event) => {
  console.log('Chunk from', event.detail.requestId, event.detail.chunk);
});
```

---

## Error Handling

Stream errors (network drops, parse failures) emit `error` and `failed` events. The async iterable throws the error, so wrap in try-catch:

```javascript
try {
  for await (const chunk of api.stream('/logs')) {
    process(chunk);
  }
} catch (err) {
  console.error('Stream failed:', err.message);
}
```

---

## Backpressure

The native Streams API preserves backpressure. If the consumer loop is slow, the fetch pauses reading from the network until the consumer catches up. This prevents unbounded memory growth on fast streams.
