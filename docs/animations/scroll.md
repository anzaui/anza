# Scroll

Scroll-driven animations link element playback to scroll position or viewport intersection. The module wraps `ScrollTimeline` and `ViewTimeline` with graceful fallbacks for unsupported browsers.

## Scroll Timeline

```javascript
import { animations } from '@anzaui/anza/animations';

const timeline = animations.scroll({
  source: document.querySelector('.scroll-container'),
  axis: 'block'
});

el.animate(
  [{ transform: 'translateX(0)' }, { transform: 'translateX(100px)' }],
  { duration: 1000, timeline }
);
```

The animation progress is tied to the scroll position of the source element.

## View Timeline

```javascript
const timeline = animations.view({
  subject: el,
  axis: 'block',
  inset: '0px'
});

el.animate(
  [{ opacity: 0 }, { opacity: 1 }],
  { duration: 1000, timeline }
);
```

The animation plays as the element enters and exits the viewport.

## Fallback

If `ScrollTimeline` or `ViewTimeline` is not available, a descriptor object is returned with `unsupported: true`:

```javascript
const timeline = animations.scroll();
if (timeline.unsupported) {
  // Fallback: use scroll listener + manual animation
}
```

## Platform Check

```javascript
import { supports } from '@anzaui/anza/platform';

if (supports.scrollTimeline) {
  // Use ScrollTimeline
}

if (supports.viewTimeline) {
  // Use ViewTimeline
}
```
