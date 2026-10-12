/**
 * HTML escaping, identical in all three engines: `&` `<` `>` `"` `'` become
 * `&amp;` `&lt;` `&gt;` `&quot;` `&#39;`. Safe for element content and quoted
 * attribute values.
 */
const SPECIAL = /[&<>"']/;
const SPECIAL_ALL = /[&<>"']/g;
const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text: string): string {
  return SPECIAL.test(text) ? text.replace(SPECIAL_ALL, (c) => ENTITIES[c]) : text;
}
