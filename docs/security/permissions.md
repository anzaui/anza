# Permissions

Query and watch browser permission states for device capabilities like geolocation, camera, microphone, and notifications.

## Query

```javascript
import { security } from '@anzaui/anza/security';

const state = await security.permission('geolocation');
// 'granted' | 'denied' | 'prompt'
```

Returns `'denied'` if the Permissions API is unavailable or the permission name is unrecognized.

## Watch

```javascript
const dispose = security.watchPermission('geolocation', (state) => {
  console.log('Geolocation permission:', state);
});

// Stop watching
dispose();
```

## AbortSignal Cleanup

```javascript
const ctrl = new AbortController();

security.watchPermission('camera', (state) => {
  updateCameraUI(state);
}, ctrl.signal);

// Auto-cleanup on unmount
ctrl.abort();
```

## Common Permission Names

| Name | Description |
| ------ | ------------- |
| `geolocation` | GPS location |
| `camera` | Video camera |
| `microphone` | Audio input |
| `notifications` | Push notifications |
| `clipboard-read` | Clipboard read |
| `clipboard-write` | Clipboard write |

Not all permissions are supported in all browsers. Unsupported names return `'denied'`.

## Example: Camera Gated Component

```javascript
async function initCamera() {
  const state = await security.permission('camera');

  if (state === 'denied') {
    showError('Camera access is required');
    return;
  }

  if (state === 'prompt') {
    showInfo('Please allow camera access when prompted');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  videoElement.srcObject = stream;
}
```
