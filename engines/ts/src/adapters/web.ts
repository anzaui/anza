import type { Document } from '../models/document.js';
import type { Envelope } from '../models/envelope.js';
import { formatEvent } from '../stream/sse.js';

export function htmlResponse(document: Document | string, status = 200, headers?: HeadersInit): Response {
  const body = typeof document === 'string' ? document : document.html;
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...headers,
    },
  });
}

export function jsonResponse(envelope: Envelope | any, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(envelope), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

export function sseEvent(envelope: Envelope): string {
  return formatEvent(envelope);
}
