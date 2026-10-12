/**
 * types/bin/create.d.ts
 *
 * Types for `@anzaui/anza/bin/create`, the project scaffolder used by
 * `npm create @anzaui/anza <name>`.
 */

/** Writes a new project into `target` (exits the process if it already exists). */
export function run(target: string, name: string, library: string): void;
/** Recursive copy; returns false on failure. */
export function copy(src: string, dst: string): boolean;
/** Writes a file, creating parent directories (exits the process on failure). */
export function write(path: string, content: string | Uint8Array): void;
