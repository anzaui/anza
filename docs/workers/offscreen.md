# Offscreen

Transfer an `HTMLCanvasElement` to a worker for off-main-thread rendering. The worker receives the canvas via `transferControlToOffscreen()`.

## Transfer

```javascript
import { workers } from '@anzaui/anza/workers';

const canvas = document.getElementById('canvas');
const handle = await workers.offscreen(canvas, '/workers/renderer.js');
```

The worker must respond with `{ ok: true }` on the received port to signal readiness.

## Worker Implementation

```javascript
// /workers/renderer.js
self.onmessage = (e) => {
  const { canvas, port } = e.data;
  const ctx = canvas.getContext('2d');

  // Signal ready
  port.postMessage({ ok: true });

  // Render on message
  self.onmessage = (e) => {
    if (e.data.type === 'resize') {
      // handle resize
    } else {
      // draw
      ctx.fillRect(0, 0, 100, 100);
    }
  };
};
```

## Send Commands

```javascript
handle.send({ type: 'draw', shape: 'circle', x: 50, y: 50 });
```

## Resize

```javascript
handle.resize({ width: 400, height: 300, dpr: 2 });
```

Forwards new dimensions and device pixel ratio to the worker.

## Close

```javascript
handle.close();
```

Terminates the worker and releases the handle.

## Requirements

Requires `OffscreenCanvas` and `transferControlToOffscreen()`. Check with the platform layer:

```javascript
import { supports } from '@anzaui/anza/platform';

if (supports.offscreenCanvas) {
  const handle = await workers.offscreen(canvas, '/workers/renderer.js');
}
```
