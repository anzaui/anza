/**
 * types/core/platform/index.d.ts
 *
 * TypeScript declarations for browser-native feature detection flags and platform guards.
 */

export interface Supports {
  // --- Routing ---
  readonly navigationAPI: boolean;
  readonly urlPattern: boolean;

  // --- Component Model ---
  readonly declarativeShadowDOM: boolean;
  readonly customStatePseudo: boolean;
  readonly formAssociated: boolean;

  // --- Overlay / Popover ---
  readonly popoverAPI: boolean;
  readonly anchorPositioning: boolean;

  // --- Animation ---
  readonly viewTransitions: boolean;
  readonly scrollTimeline: boolean;
  readonly viewTimeline: boolean;

  // --- Scheduling ---
  readonly schedulerPostTask: boolean;
  readonly schedulerYield: boolean;

  // --- CSS ---
  readonly contentVisibility: boolean;
  readonly cssScope: boolean;
  readonly cssLayer: boolean;
  readonly cssModuleScripts: boolean;

  // --- Module System ---
  readonly importMaps: boolean;

  // --- Security ---
  readonly sanitizerAPI: boolean;
  readonly trustedTypes: boolean;
  readonly subtleCrypto: boolean;

  // --- Storage ---
  readonly opfs: boolean;
  readonly storageManager: boolean;
  readonly fileSystemPickers: boolean;
  readonly compression: boolean;
  readonly storagePersistence: boolean;

  // --- Networking / Workers ---
  readonly backgroundSync: boolean;
  readonly speculationRules: boolean;
  readonly sharedWorker: boolean;
  readonly webLocks: boolean;
  readonly offscreenCanvas: boolean;

  // --- Notifications / Push ---
  readonly pushAPI: boolean;
  readonly notificationsAPI: boolean;

  // --- Device ---
  readonly screenWakeLock: boolean;
  readonly idleDetection: boolean;
  readonly webAuthn: boolean;
}

export const supports: Supports;

export function reset(key: keyof Supports): void;

export function typeGuard(key: keyof Supports, message?: string): void;

export interface SanitizerWrapper {
  sanitizeToString(input: string): string;
}

export interface EscapeOptions {
  placement?: string;
  offset?: number;
  signal?: AbortSignal;
  cssAnchor?: boolean;
  strategy?: 'popover' | 'fixed';
}

export interface EscapeController {
  show(): void;
  hide(): void;
  update(): void;
  release(): void;
  readonly strategy: 'popover' | 'fixed';
  readonly open: boolean;
}

export interface Guard {
  urlPattern(): Promise<typeof URLPattern>;
  navigation(): Promise<Navigation>;
  popover(): Promise<void>;
  shadow(root?: Document | ShadowRoot): Promise<void>;
  anchor(floating: HTMLElement, anchorEl: HTMLElement, options?: object): Promise<void>;
  escape(floating: HTMLElement, anchorEl: HTMLElement, options?: EscapeOptions): Promise<EscapeController>;
  sanitizer(): Promise<SanitizerWrapper>;
  scheduler(): Promise<Scheduler>;
  yield(): Promise<void>;
}

export const guard: Guard;

export function escapeOverflow(
  floating: HTMLElement,
  anchor: HTMLElement,
  options?: EscapeOptions
): EscapeController;
