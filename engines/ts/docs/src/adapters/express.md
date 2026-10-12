# Express Integration

`src/adapters/express.ts` provides `sendHtml`, `sendJson` and `sendSse`.

## 1. Handlers

```typescript
import express from 'express';
import { Fragment, Page, Setup } from '@anzaui/engine';
import { sendHtml, sendJson, sendSse } from '@anzaui/engine/adapters/express';

const engine = await new Setup({ root: './templates' }).run();
const app = express();

// Full page
app.get('/', async (req, res) => {
  const doc = await new Page('/', { title: 'Express STUI' }).run(engine);
  sendHtml(res, doc);
});

// Signed fragment
app.get('/card', async (req, res) => {
  const envelope = await new Fragment('feed/card.html', 'main', { status: 'online' }).run(engine);
  sendJson(res, envelope);
});

// SSE stream
app.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const timer = setInterval(async () => {
    const envelope = await new Fragment('feed/card.html', 'feed', { title: 'Live Update' }).run(engine);
    sendSse(res, envelope);
  }, 2000);

  req.on('close', () => clearInterval(timer));
});

app.listen(3000);
```
