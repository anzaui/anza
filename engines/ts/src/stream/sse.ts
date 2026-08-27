import type { Envelope } from '../models/envelope.js';

export function formatEvent(envelope: Envelope): string {
  const json = JSON.stringify(envelope);
  return `event: template\ndata: ${json}\n\n`;
}
