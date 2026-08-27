import type { Document } from '../models/document.js';
import type { Envelope } from '../models/envelope.js';

export function sendHtml(reply: any, document: Document | string, status = 200) {
  const body = typeof document === 'string' ? document : document.html;
  return reply.code(status).type('text/html; charset=utf-8').send(body);
}

export function sendJson(reply: any, envelope: Envelope | any, status = 200) {
  return reply.code(status).type('application/json; charset=utf-8').send(envelope);
}
