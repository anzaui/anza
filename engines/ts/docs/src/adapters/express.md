# Express.js Integration

The Express adapter provides response helpers for `res.send()`, `res.json()`, and Server-Sent Events.

## 1. Handlers in Express

Located in `src/adapters/express.ts`:

```typescript
import express from 'express';
import { Setup, Page, Fragment } from 'anza';
import { sendHtml, sendJson, sendSse } from 'anza/adapters/express.js';

const engine = await new Setup({ root: './templates' }).run();
const app = express();

// Full-Page SSR
app.get('/', async (req, res) => {
  const doc = await new Page('/', { title: 'Express STUI' }).run(engine);
  sendHtml(res, doc);
});

// Partial Signed Fragment
app.get('/card', async (req, res) => {
  const envelope = await new Fragment('feed/card.html', 'main', { status: 'online' }).run(engine);
  sendJson(res, envelope);
});

// SSE Stream
app.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  setInterval(async () => {
    const env = await engine.renderFragment('feed/card.html', 'feed', { title: 'Live Update' });
    sendSse(res, env);
  }, 2000);
});

app.listen(3000);
```
