import type { Document } from '../models/document.js';
import type { Envelope } from '../models/envelope.js';
import { htmlResponse, jsonResponse, sseEvent } from './web.js';

export { htmlResponse, jsonResponse, sseEvent };

export function html(c: any, document: Document | string, status = 200) {
  const body = typeof document === 'string' ? document : document.html;
  return c.html(body, status);
}

export function json(c: any, envelope: Envelope | any, status = 200) {
  return c.json(envelope, status);
}
