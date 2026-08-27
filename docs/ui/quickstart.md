# Quick Start

Get a working component in five minutes.

---

## 1. Define a Component

```javascript
import { view } from '@anzaui/anza/defs';

view('hello-world', {
  template: '<h1>Hello, World</h1>'
});
```

Use it:

```html
<hello-world></hello-world>
```

---

## 2. Add Reactive Properties

```javascript
view('user-greeting', {
  props: {
    name: { type: String, default: 'Guest' }
  },
  template: '<h1>Hello, <span ref="name"></span></h1>',
  on: {
    connect({ el, refs }) {
      refs.name.textContent = el.name;
    },
    change({ name, val, refs }) {
      if (name === 'name') refs.name.textContent = val;
    }
  }
});
```

Use it:

```html
<user-greeting name="Alice"></user-greeting>
```

Or set from JavaScript:

```javascript
document.querySelector('user-greeting').name = 'Bob';
```

The `change` hook fires automatically when `name` changes.

---

## 3. Use a File Template

```javascript
view('product-card', {
  props: {
    price: { type: Number, default: 0 }
  },
  template: { html: './product.html', css: './product.css' }
}, import.meta.url);
```

Paths resolve relative to `import.meta.url`. The native toolchain copies assets during build.

---

## 4. Event Delegation

```javascript
view('todo-item', {
  props: {
    done: { type: Boolean }
  },
  template: `
    <li>
      <span ref="label"></span>
      <button class="toggle">Toggle</button>
    </li>
  `,
  on: {
    connect({ el, refs, on }) {
      on.click('.toggle', (event, target) => {
        el.done = !el.done;
      });
    },
    change({ name, val, el, refs }) {
      if (name === 'done') {
        refs.label.style.textDecoration = val ? 'line-through' : '';
      }
    }
  }
});
```

`on.click('.toggle', handler)` uses event delegation. One listener on the shadow root handles all `.toggle` clicks.

---

## 5. Mutation Watching

Watch for text changes in the DOM:

```javascript
view('live-counter', {
  template: '<span class="count">0</span>',
  on: {
    connect({ on, watch }) {
      on.click('.count', () => {
        // external script updates the count
      });

      watch.text('.count', (text, old, el) => {
        console.log('Count changed from', old, 'to', text);
      });
    }
  }
});
```

---

## 6. Observers

```javascript
import { observe } from '@anzaui/anza/ui';

view('lazy-image', {
  template: '<img ref="img" data-src="./photo.jpg">',
  on: {
    connect({ el, refs, ctrl }) {
      observe.intersection(refs.img, (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            refs.img.src = refs.img.dataset.src;
          }
        }
      }, ctrl.signal);
    }
  }
});
```

`ctrl.signal` aborts the observer when the element disconnects. No manual cleanup needed.

---

## 7. Scheduling Heavy Work

```javascript
import { ui } from '@anzaui/anza/ui';

view('data-table', {
  on: {
    async load({ el }) {
      const rows = await fetchRows();
      for (const chunk of chunks(rows, 100)) {
        renderChunk(chunk);
        await ui.yield(); // yield to the browser
      }
    }
  }
});
```

`ui.yield()` returns control to the browser so the UI stays responsive.

---

## 8. View Transition

```javascript
import { ui } from '@anzaui/anza/ui';

view('gallery', {
  on: {
    connect({ on, refs }) {
      on.click('.thumb', async (e, target) => {
        await ui.transition(() => {
          refs.main.src = target.dataset.full;
        });
      });
    }
  }
});
```

`ui.transition()` wraps the DOM update in a CSS View Transition when supported, falling back to synchronous execution otherwise.

---

## Complete Working Example

```javascript
import { view } from '@anzaui/anza/defs';

view('counter-app', {
  props: {
    count: { type: Number, default: 0 }
  },
  template: `
    <div>
      <span ref="display">0</span>
      <button class="inc">+</button>
      <button class="dec">-</button>
    </div>
  `,
  on: {
    connect({ el, refs, on }) {
      on.click('.inc', () => el.count++);
      on.click('.dec', () => el.count--);
    },
    change({ name, val, refs }) {
      if (name === 'count') refs.display.textContent = val;
    }
  }
});
```

Drop `<counter-app></counter-app>` into HTML and it works.
