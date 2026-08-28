# Supports

The `supports` object contains 30+ lazy-evaluated boolean flags for browser capabilities. Each flag is detected on first access and cached for the lifetime of the page.

## Routing

| Flag | Detects |
| ------ | --------- |
| `supports.navigationAPI` | `window.navigation` exists |
| `supports.urlPattern` | `URLPattern` in global scope |

## Component Model

| Flag | Detects |
| ------ | --------- |
| `supports.declarativeShadowDOM` | `shadowRootMode` on `HTMLTemplateElement` |
| `supports.customStatePseudo` | `ElementInternals.states` |
| `supports.formAssociated` | `HTMLElement.attachInternals` |

## Overlay / Popover

| Flag | Detects |
| ------ | --------- |
| `supports.popoverAPI` | `popover` on `HTMLElement.prototype` |
| `supports.anchorPositioning` | `CSS.supports('anchor-name', '--a')` |

Used by `guard.popover`, `guard.anchor`, and `guard.escape` / `escapeOverflow` (floating UI). See [guards.md](guards.md) and [Overlay patterns](../elements/overlay.md).

## Animation

| Flag | Detects |
| ------ | --------- |
| `supports.viewTransitions` | `document.startViewTransition` |
| `supports.elementViewTransitions` | `Element.prototype.startViewTransition` (dock-scoped) |
| `supports.scrollTimeline` | `ScrollTimeline` in window |
| `supports.viewTimeline` | `ViewTimeline` in window |

## Scheduling

| Flag | Detects |
| ------ | --------- |
| `supports.schedulerPostTask` | `scheduler.postTask` |
| `supports.schedulerYield` | `scheduler.yield` |

## CSS

| Flag | Detects |
| ------ | --------- |
| `supports.contentVisibility` | `content-visibility: auto` |
| `supports.cssScope` | `:scope` selector |
| `supports.cssLayer` | `@layer` at-rule |
| `supports.cssModuleScripts` | Import attributes (proxy) |

## Module System

| Flag | Detects |
| ------ | --------- |
| `supports.importMaps` | `HTMLScriptElement.supports('importmap')` |

## Security

| Flag | Detects |
| ------ | --------- |
| `supports.sanitizerAPI` | `Sanitizer` in window |
| `supports.trustedTypes` | `trustedTypes` in window |
| `supports.subtleCrypto` | `crypto.subtle` |

## Storage

| Flag | Detects |
| ------ | --------- |
| `supports.opfs` | `navigator.storage.getDirectory` |
| `supports.storageManager` | `navigator.storage` |
| `supports.fileSystemPickers` | `showOpenFilePicker` |
| `supports.compression` | `CompressionStream` and `DecompressionStream` |
| `supports.storagePersistence` | `navigator.storage.persist` |

## Networking / Workers

| Flag | Detects |
| ------ | --------- |
| `supports.backgroundSync` | `ServiceWorkerRegistration.sync` |
| `supports.speculationRules` | `HTMLScriptElement.supports('speculationrules')` |
| `supports.sharedWorker` | `SharedWorker` in window |
| `supports.webLocks` | `navigator.locks` |
| `supports.offscreenCanvas` | `OffscreenCanvas` in window |

## Notifications / Push

| Flag | Detects |
| ------ | --------- |
| `supports.pushAPI` | `PushManager` in window |
| `supports.notificationsAPI` | `Notification` in window |

## Device

| Flag | Detects |
| ------ | --------- |
| `supports.screenWakeLock` | `navigator.wakeLock` |
| `supports.idleDetection` | `IdleDetector` in window |
| `supports.webAuthn` | `PublicKeyCredential` in window |

## Reset for Testing

Clear a cached flag to force re-detection:

```javascript
import { reset } from '@anzaui/anza/platform';

reset('urlPattern'); // clears cache
```

This is useful in unit tests when mocking feature states:

```javascript
Object.defineProperty(supports, 'urlPattern', { value: false, configurable: true });
// ... test polyfill path ...
reset('urlPattern'); // restore
```
