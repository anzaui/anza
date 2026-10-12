/**
 * Template names and page routes (see `docs/engines/contract.md`).
 *
 * A template name is a relative, `/`-separated path under the template root:
 * not empty, no leading `/`, no `\` or NUL, and no empty, `.` or `..`
 * segment. Names are only ever looked up in the in-memory cache; request
 * input never reaches the filesystem.
 */

/** Whether `name` is a well-formed template name. */
export function validName(name: string): boolean {
  if (typeof name !== 'string' || name === '' || name.startsWith('/') || name.includes('\\') || name.includes('\0')) {
    return false;
  }
  return name.split('/').every((seg) => seg !== '' && seg !== '.' && seg !== '..');
}

/**
 * The page template for a request route: `/` is `pages/home.html`, `/a/b` is
 * `pages/a/b.html`. `null` when the route is not a valid name.
 */
export function pageTemplate(route: string): string | null {
  const clean = String(route).replace(/^\/+|\/+$/g, '');
  if (clean === '') return 'pages/home.html';
  return validName(clean) ? `pages/${clean}.html` : null;
}

/**
 * Whether a fragment may render `name` under the `fragments` allowlist: empty
 * allows every template; an entry ending in `/` allows that prefix, any other
 * entry allows that exact name.
 */
export function fragmentAllowed(list: readonly string[], name: string): boolean {
  return list.length === 0 || list.some((entry) => (entry.endsWith('/') ? name.startsWith(entry) : name === entry));
}
