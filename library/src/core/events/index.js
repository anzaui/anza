/**
 * src/core/events/index.js
 *
 * Public event architecture entry point.
 * Aggregates EventBus dispatchers, Shadow-DOM composed delegation, single-event awaits,
 * progressive passive listener registrations, and standardized system event names.
 *
 * Source: doc 10 — Event Architecture §1, §9
 */

import { bus, EventBus } from './bus.js';
import { delegate } from './delegate.js';
import { once } from './once.js';
import { listen } from './listen.js';
import { names } from './types/index.js';
import {
  matchInComposedPath,
  matchesAttrs,
  PASSIVE_DEFAULT_TYPES,
  resolvePassiveDefault
} from './match.js';

export const events = {
  emit: (type, detail) => bus.emit(type, detail),
  on: (type, fn, signal) => bus.on(type, fn, signal),
  delegate,
  once,
  listen,
  names
};

export {
  bus,
  EventBus,
  delegate,
  once,
  listen,
  names,
  matchInComposedPath,
  matchesAttrs,
  PASSIVE_DEFAULT_TYPES,
  resolvePassiveDefault
};
