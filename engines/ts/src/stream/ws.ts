import type { Envelope } from '../models/envelope.js';

export function formatPacket(envelope: Envelope): string {
  return JSON.stringify(envelope);
}
