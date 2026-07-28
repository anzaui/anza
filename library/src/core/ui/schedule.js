/**
 * src/core/ui/schedule.js
 *
 * Cooperative Browser Task Scheduler.
 * Wraps browser scheduler primitives (postTask and yield) with progressive fallbacks
 * to prevent main thread blocking, ensuring high Interaction to Next Paint (INP).
 *
 * Soft-nav / leaf teardown: pass `{ signal: ctrl.signal }` so pending work is
 * rejected with AbortError instead of running against a detached tree.
 *
 * Source: doc 12 — Performance §2, doc 19 — Browser Runtime Model §3
 */

export const Priority = {
  BLOCKING: 'user-blocking',
  VISIBLE: 'user-visible',
  BACKGROUND: 'background'
};

function abortError(reason) {
  if (reason instanceof DOMException && reason.name === 'AbortError') return reason;
  return new DOMException(String(reason ?? 'Aborted'), 'AbortError');
}

/**
 * Normalize `schedule(fn, priority)` and `schedule(fn, { priority, signal, delay })`.
 * @param {string|object} [priorityOrOpts]
 */
function normalizeScheduleOpts(priorityOrOpts) {
  if (priorityOrOpts == null || typeof priorityOrOpts === 'string') {
    return { priority: priorityOrOpts || Priority.VISIBLE };
  }
  return priorityOrOpts;
}

/**
 * Schedules a callback using scheduler.postTask, falling back safely.
 * @param {Function} fn
 * @param {string|{ priority?: string, signal?: AbortSignal, delay?: number }} [priorityOrOpts]
 * @returns {Promise<*>}
 */
export function schedule(fn, priorityOrOpts = Priority.VISIBLE) {
  const { priority = Priority.VISIBLE, signal, delay } = normalizeScheduleOpts(priorityOrOpts);

  if (signal?.aborted) {
    return Promise.reject(abortError(signal.reason));
  }

  if (typeof window !== 'undefined' && window.scheduler?.postTask) {
    const opts = { priority };
    if (signal) opts.signal = signal;
    if (delay != null) opts.delay = delay;
    return window.scheduler.postTask(fn, opts);
  }

  // Graceful fallback to micro/macro-task scheduling with AbortSignal
  return new Promise((resolve, reject) => {
    let settled = false;
    let idleId = null;
    let timeoutId = null;

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
      if (idleId != null && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(idleId);
        idleId = null;
      }
      if (timeoutId != null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(abortError(signal?.reason));
    };

    const run = () => {
      if (settled) return;
      if (signal?.aborted) {
        onAbort();
        return;
      }
      settled = true;
      cleanup();
      try {
        resolve(fn());
      } catch (err) {
        reject(err);
      }
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    try {
      const wait = delay != null ? delay : (priority === Priority.BLOCKING ? 0 : 16);
      if (priority === Priority.BACKGROUND && delay == null
          && typeof requestIdleCallback !== 'undefined') {
        idleId = requestIdleCallback(run);
      } else {
        timeoutId = setTimeout(run, wait);
      }
    } catch (err) {
      settled = true;
      cleanup();
      reject(err);
    }
  });
}

/**
 * Schedules a callback to be run during requestAnimationFrame.
 * @param {Function} fn
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<*>}
 */
export function scheduleFrame(fn, options = {}) {
  const { signal } = options;

  if (signal?.aborted) {
    return Promise.reject(abortError(signal.reason));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let rafId = null;

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
      if (rafId != null) cancelAnimationFrame(rafId);
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(abortError(signal?.reason));
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    rafId = requestAnimationFrame(() => {
      if (settled) return;
      if (signal?.aborted) {
        onAbort();
        return;
      }
      settled = true;
      cleanup();
      try {
        resolve(fn());
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Cooperative yielding mechanism for chunking heavy computations.
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function yieldTask(options = {}) {
  const { signal } = options;
  if (signal?.aborted) {
    throw abortError(signal.reason);
  }

  if (typeof window !== 'undefined' && window.scheduler?.yield) {
    // Native yield does not accept signal; race abort manually.
    if (!signal) return window.scheduler.yield();
    return Promise.race([
      window.scheduler.yield(),
      new Promise((_, reject) => {
        const onAbort = () => reject(abortError(signal.reason));
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
      })
    ]);
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal.reason));
      return;
    }
    const onAbort = () => {
      clearTimeout(id);
      reject(abortError(signal?.reason));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    const id = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, 0);
  });
}
