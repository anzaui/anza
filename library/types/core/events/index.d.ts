/**
 * types/core/events/index.d.ts
 *
 * TypeScript declarations for the native event orchestration layer.
 */

export class EventBus extends EventTarget {
  on(type: string, fn: (event: CustomEvent) => void, signal?: AbortSignal): () => void;
  emit(type: string, detail?: any): void;
}

export const bus: EventBus;

export function delegate(
  root: HTMLElement | ShadowRoot,
  selector: string,
  type: string,
  fn: (event: Event, target: HTMLElement) => void,
  options?: boolean | AddEventListenerOptions
): () => void;

export function once(
  target: EventTarget,
  type: string,
  options?: boolean | AddEventListenerOptions
): Promise<Event>;

export function listen(
  target: EventTarget,
  type: string,
  fn: (event: Event) => void,
  options?: boolean | AddEventListenerOptions
): () => void;

export const names: {
  auth: { signedin: string; signedout: string; refreshed: string };
  connectivity: { online: string; offline: string };
  preference: { changed: string };
  sw: { updated: string; message: string };
};

export const events: {
  emit(type: string, detail?: any): void;
  on(type: string, fn: (event: CustomEvent) => void, signal?: AbortSignal): () => void;
  delegate: typeof delegate;
  once: typeof once;
  listen: typeof listen;
  names: typeof names;
};


/**
 * Walks `composedPath()` and returns the first element matching `selector`
 * before `root` (exclusive).
 */
export function matchInComposedPath(
  event: Event,
  selector: string,
  root: Node,
  scope?: 'path' | 'shadow' | 'assigned'
): Element | null;

/** True when every attribute equals `String(value)`; `null` means the attribute must be absent. */
export function matchesAttrs(
  element: Element,
  attrs?: Record<string, string | number | boolean | null> | null
): boolean;

/** Event types registered as passive by default (touchstart, touchmove, wheel, …). */
export const PASSIVE_DEFAULT_TYPES: ReadonlySet<string>;

/** Explicit `passive` wins; otherwise passive for PASSIVE_DEFAULT_TYPES. */
export function resolvePassiveDefault(eventType: string, optionsPassive?: boolean): boolean;
