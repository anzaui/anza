import type { Document } from '../models/document.js';
import type { Envelope } from '../models/envelope.js';
import { formatEvent } from '../stream/sse.js';

export function sendHtml(res: any, document: Document | string, status = 200) {
  const body = typeof document === 'string' ? document : document.html;
  return res.status(status).type('html').send(body);
}

export function sendJson(res: any, envelope: Envelope | any, status = 200) {
  return res.status(status).json(envelope);
}

export function sendSse(res: any, envelope: Envelope) {
  res.write(formatEvent(envelope));
}
