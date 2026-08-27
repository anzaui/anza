import { AnzaError } from '../../errors/index.js';

export type Chunk =
  | { type: 'static'; value: string }
  | { type: 'slot'; name: string };

export function extract(template: string): Chunk[] {
  const chunks: Chunk[] = [];
  let cursor = 0;
  const len = template.length;

  while (cursor < len) {
    const openIdx = template.indexOf('{{', cursor);
    if (openIdx === -1) {
      chunks.push({ type: 'static', value: template.slice(cursor) });
      break;
    }

    if (openIdx > cursor) {
      chunks.push({ type: 'static', value: template.slice(cursor, openIdx) });
    }

    const closeIdx = template.indexOf('}}', openIdx + 2);
    if (closeIdx === -1) {
      throw AnzaError.template("Unclosed slot placeholder '{{' in template");
    }

    const slotName = template.slice(openIdx + 2, closeIdx).trim();
    if (!slotName) {
      throw AnzaError.template('Empty slot placeholder {{}} in template');
    }

    chunks.push({ type: 'slot', name: slotName });
    cursor = closeIdx + 2;
  }

  return chunks;
}
