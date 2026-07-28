export const specRegistry = new Map();
export const assetCache = new Map();
export const internalsMap = new WeakMap();
export const initializedMap = new WeakMap();
export const pendingUpdatesMap = new WeakMap();
export const updateScheduledMap = new WeakMap();
/** True when constructor adopted a pre-existing open shadow (DSD / SSR). */
export const adoptedMap = new WeakMap();
/** True after a one-shot hydration mismatch fallback for this host. */
export const hydrationFallbackMap = new WeakMap();
