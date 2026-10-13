# Streaming

The API client parses NDJSON (newline-delimited JSON) streams natively using the Streams API, yielding parsed objects as an async iterable while preserving backpressure.

## Basic Streaming

```javascript
import { api } from '@anzaui/anza/api';

for await (const chunk of api.stream('/logs/stream')) {
  console.log(chunk.timestamp, chunk.message);
}
```

Each yielded value is a parsed JSON object. The stream is read via `TextDecoderStream` and `TransformStream` pipelines.

`api.stream` calls `fetch` directly. It does not apply prefixes, the pipeline, caching, retries or a timeout. Pass a full path or `api.prefix.resolve(path)`.

## Stream Options

Options other than `signal`, `on` and `requestId` are passed to `fetch` as-is. The body is not serialized:

```javascript
const controller = new AbortController();

for await (const chunk of api.stream('/ai/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Hello' }),
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
| `headers` | Request headers, passed to `fetch` |
| `body` | Request body, passed to `fetch` unchanged |
| `signal` | AbortSignal for cancellation |
| `on` | Per-request event listeners |
| `requestId` | ID used in event `detail` (default: generated) |

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

## Chunk Events

Every parsed chunk emits a `chunk` event on the telemetry bus:

```javascript
api.on('chunk', (event) => {
  console.log('Chunk from', event.detail.requestId, event.detail.chunk);
});
```

## Error Handling

A failed `fetch` emits `error` and `failed`. A non-2xx response emits `status:xxx`, `failed` and `error`. Errors while reading (network drops, invalid NDJSON lines) emit `error` only. The async iterable throws a plain `Error` (not a `PlatformError`), so wrap it in try-catch:

```javascript
try {
  for await (const chunk of api.stream('/logs')) {
    process(chunk);
  }
} catch (err) {
  console.error('Stream failed:', err.message);
}
```

## Backpressure

Chunks are read only as the loop asks for them, so the Streams API applies backpressure: a slow consumer slows reading from the network instead of buffering the whole response.
