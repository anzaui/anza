import { AnzaError } from '../../errors/index.js';

export type Chunk =
  | { type: 'static'; value: string }
  /** `{{name}}`: HTML-escaped when the engine runs with `escape: true`. */
  | { type: 'slot'; name: string }
  /** `{{{name}}}`: always inserted as-is. */
  | { type: 'raw'; name: string };

/** Split a template into static text and `{{slot}}` / `{{{raw}}}` chunks. */
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

    const raw = template.charCodeAt(openIdx + 2) === 123; // '{'
    const open = raw ? 3 : 2;
    const close = raw ? '}}}' : '}}';
    const closeIdx = template.indexOf(close, openIdx + open);
    if (closeIdx === -1) {
      throw AnzaError.template(raw ? "Unclosed raw slot placeholder '{{{' in template" : "Unclosed slot placeholder '{{' in template");
    }

    const slotName = template.slice(openIdx + open, closeIdx).trim();
    if (!slotName) {
      throw AnzaError.template('Empty slot placeholder {{}} in template');
    }

    chunks.push(raw ? { type: 'raw', name: slotName } : { type: 'slot', name: slotName });
    cursor = closeIdx + close.length;
  }

  return chunks;
}
