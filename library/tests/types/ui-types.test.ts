/**
 * tests/types/ui-types.test.ts
 *
 * TypeScript compilation-only tests for UI types.
 */

import { ui, ComponentHost, ElementSpec } from '@anzaui/anza/ui';

// Test simple property casting and element definition type inference
const propsDef = {
  active: { type: Boolean, default: false },
  count: { type: Number },
  name: { type: String }
};

interface TestRefs {
  btn: HTMLButtonElement;
}

const spec: ElementSpec<typeof propsDef, TestRefs, true, {
  custom(a: number): string;
}> = {
  template: '<div><button ref="btn">Click</button></div>',
  form: true,
  props: propsDef,

  mount(ctx) {
    // Verify properties exist on el
    const activeVal: boolean = ctx.el.active;
    const countVal: number = ctx.el.count;
    const nameVal: string = ctx.el.name;

    // Verify ref types are resolved correctly
    const button: HTMLButtonElement = ctx.refs.btn;

    // Verify internals exist when form: true
    const internals: ElementInternals = ctx.internals;

    // Verify calling custom method on el
    const res: string = ctx.el.custom(42);
  },

  update(ctx) {
    if (ctx.name === 'active') {
      const v: boolean = ctx.val;
      const o: boolean = ctx.old;
    } else if (ctx.name === 'count') {
      const v: number = ctx.val;
    }
  },

  associated(form) {
    const f: HTMLFormElement | null = form;
    // Verify methods exist on this
    this.custom(123);
  },

  disabled(value) {
    const disabledVal: boolean = value;
  },

  methods: {
    custom(a: number): string {
      return `val: ${a}`;
    }
  }
};

ui.element('test-element', spec);

// Test @ts-expect-error cases to verify invalid configurations are caught by compiler
import { UnmountContext } from '@anzaui/anza/ui';
const ctxMock: UnmountContext = {
  el: {} as any,
  tags: {} as any,
  refs: {} as any,
  watch: {} as any,
  internals: {} as any
};

// @ts-expect-error: UnmountContext does not contain ctrl
const ctrlMock = ctxMock.ctrl;

const specWithInvalidMethod: ElementSpec<{}, {}, false, { custom(): string }> = {
  methods: {
    // @ts-expect-error: Cannot return number for custom method expecting string
    custom() {
      return 42;
    }
  }
};
