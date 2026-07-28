/**
 * types/core/ui/index.d.ts
 *
 * Strict TypeScript declarations for the Native UI runtime.
 */

export type TaskPriority = 'user-blocking' | 'user-visible' | 'background';

export type MaybePromise<T> = T | Promise<T>;

export type Disposer = () => void;

export type RefsMap = Record<string, Element>;

export type ElementRefs<T> = {
  [K in keyof T]: Element;
};

export type PropConstructor =
  | BooleanConstructor
  | NumberConstructor
  | StringConstructor;

export type PropValueFromConstructor<T> =
  T extends BooleanConstructor ? boolean :
  T extends NumberConstructor ? number :
  T extends StringConstructor ? string :
  never;

export interface PropConfig<T extends PropConstructor = PropConstructor> {
  type: T;
  default?: PropValueFromConstructor<T>;
  state?: boolean;
  reflect?: boolean;
}

export type AnyPropConfig =
  | PropConfig<BooleanConstructor>
  | PropConfig<NumberConstructor>
  | PropConfig<StringConstructor>;

export type PropsDefinition = Record<string, AnyPropConfig>;

export type InferProps<Props extends PropsDefinition> = {
  [K in keyof Props]: PropValueFromConstructor<Props[K]['type']>;
};

export type ComponentHost<
  Props extends PropsDefinition = {},
  Methods extends Record<string, (...args: any[]) => any> = {}
> = HTMLElement & InferProps<Props> & Methods;

export type InternalsFor<Form extends boolean> =
  Form extends true ? ElementInternals : ElementInternals | undefined;

export interface TagsApi {
  one<E extends Element = Element>(selector: string): E | null;
  all<E extends Element = Element>(selector: string): E[];
  each<E extends Element = Element>(
    selector: string,
    fn: (element: E, index: number) => void
  ): void;
  has(selector: string): boolean;
  clear(): void;
}

export interface DelegatedEventOptions extends AddEventListenerOptions {
  signal?: AbortSignal;
  once?: boolean;
}

export type DelegatedEventHandler<
  EventType extends Event = Event,
  Target extends Element = Element
> = (event: EventType, target: Target) => void;

export interface DelegatedEventBinder<EventType extends Event = Event> {
  <Target extends Element = Element>(
    selector: string,
    handler: DelegatedEventHandler<EventType, Target>,
    options?: AbortSignal | DelegatedEventOptions
  ): Disposer;

  once<Target extends Element = Element>(
    selector: string,
    handler: DelegatedEventHandler<EventType, Target>,
    options?: AbortSignal | Omit<DelegatedEventOptions, 'once'>
  ): Disposer;
}

export type EventDelegator = {
  [K in keyof GlobalEventHandlersEventMap]: DelegatedEventBinder<GlobalEventHandlersEventMap[K]>;
} & {
  [customEvent: string]: DelegatedEventBinder<Event>;
};

export interface WatchOptions {
  signal?: AbortSignal;
  once?: boolean;
}

export type WatchTarget<T extends Element = Element> = string | T;

export type AttrWatchHandler<T extends Element = Element> = (
  attrName: string,
  newValue: string | null,
  oldValue: string | null,
  element: T
) => void;

export type KidsWatchHandler<T extends Element = Element> = (
  change: {
    added: Node[];
    removed: Node[];
  },
  element: T
) => void;

export type TextWatchHandler<T extends Element = Element> = (
  newText: string,
  oldText: string | null,
  element: T | null
) => void;

export type TreeWatchHandler<T extends Element = Element> = (
  records: MutationRecord[],
  element: T | null
) => void;

export interface WatchApi {
  attr: {
    <T extends Element = Element>(
      target: WatchTarget<T>,
      attr: string | readonly string[] | '*',
      handler: AttrWatchHandler<T>,
      options?: AbortSignal | WatchOptions
    ): Disposer;

    once<T extends Element = Element>(
      target: WatchTarget<T>,
      attr: string | readonly string[] | '*',
      handler: AttrWatchHandler<T>,
      options?: AbortSignal | Omit<WatchOptions, 'once'>
    ): Disposer;
  };

  kids: {
    <T extends Element = Element>(
      target: WatchTarget<T>,
      handler: KidsWatchHandler<T>,
      options?: AbortSignal | WatchOptions
    ): Disposer;

    <T extends Element = Element>(
      target: WatchTarget<T>,
      config: { deep?: boolean },
      handler: KidsWatchHandler<T>,
      options?: AbortSignal | WatchOptions
    ): Disposer;

    once<T extends Element = Element>(
      target: WatchTarget<T>,
      handler: KidsWatchHandler<T>,
      options?: AbortSignal | Omit<WatchOptions, 'once'>
    ): Disposer;

    once<T extends Element = Element>(
      target: WatchTarget<T>,
      config: { deep?: boolean },
      handler: KidsWatchHandler<T>,
      options?: AbortSignal | Omit<WatchOptions, 'once'>
    ): Disposer;
  };

  text: {
    <T extends Element = Element>(
      target: WatchTarget<T>,
      handler: TextWatchHandler<T>,
      options?: AbortSignal | WatchOptions
    ): Disposer;

    once<T extends Element = Element>(
      target: WatchTarget<T>,
      handler: TextWatchHandler<T>,
      options?: AbortSignal | Omit<WatchOptions, 'once'>
    ): Disposer;
  };

  tree: {
    <T extends Element = Element>(
      target: WatchTarget<T>,
      handler: TreeWatchHandler<T>,
      options?: AbortSignal | WatchOptions
    ): Disposer;

    once<T extends Element = Element>(
      target: WatchTarget<T>,
      handler: TreeWatchHandler<T>,
      options?: AbortSignal | Omit<WatchOptions, 'once'>
    ): Disposer;
  };
}

export interface BaseLifecycleContext<
  Props extends PropsDefinition = {},
  Refs extends ElementRefs<Refs> = RefsMap,
  Form extends boolean = false,
  Methods extends Record<string, (...args: any[]) => any> = {}
> {
  el: ComponentHost<Props, Methods>;
  ctrl: AbortController;
  tags: TagsApi;
  on: EventDelegator;
  refs: Readonly<Refs>;
  watch: WatchApi;
  internals: InternalsFor<Form>;
  /** True when the element adopted a pre-existing open shadow root (DSD / SSR). */
  adopted?: boolean;
}
export type MountContext<
  Props extends PropsDefinition = {},
  Refs extends ElementRefs<Refs> = RefsMap,
  Form extends boolean = false,
  Methods extends Record<string, (...args: any[]) => any> = {}
> = BaseLifecycleContext<Props, Refs, Form, Methods>;

export type UpdateContext<
  Props extends PropsDefinition = {},
  Refs extends ElementRefs<Refs> = RefsMap,
  Form extends boolean = false,
  Methods extends Record<string, (...args: any[]) => any> = {}
> = keyof Props extends never
  ? never
  : {
      [K in keyof Props & string]:
        BaseLifecycleContext<Props, Refs, Form, Methods> & {
          name: K;
          val: PropValueFromConstructor<Props[K]['type']>;
          prev: PropValueFromConstructor<Props[K]['type']>;
          old: PropValueFromConstructor<Props[K]['type']>;
        }
    }[keyof Props & string];

export type UnmountContext<
  Props extends PropsDefinition = {},
  Refs extends ElementRefs<Refs> = RefsMap,
  Form extends boolean = false,
  Methods extends Record<string, (...args: any[]) => any> = {}
> = Pick<
  BaseLifecycleContext<Props, Refs, Form, Methods>,
  'el' | 'tags' | 'refs' | 'watch' | 'internals'
>;

export interface ElementSpec<
  Props extends PropsDefinition = {},
  Refs extends ElementRefs<Refs> = RefsMap,
  Form extends boolean = false,
  Methods extends Record<string, (...args: any[]) => any> = {}
> {
  template?: string;
  style?: string;
  mode?: ShadowRootMode;
  props?: Props;
  form?: Form;
  url?: string;
  container?: string;
  query?: readonly string[] | string[];
  meta?: Record<string, unknown>;

  mount?: (
    context: MountContext<Props, Refs, Form, Methods>
  ) => MaybePromise<void>;

  update?: (
    context: UpdateContext<Props, Refs, Form, Methods>
  ) => MaybePromise<void>;

  unmount?: (
    context: UnmountContext<Props, Refs, Form, Methods>
  ) => void;

  associated?: (
    this: ComponentHost<Props, Methods>,
    form: HTMLFormElement | null
  ) => void;

  disabled?: (
    this: ComponentHost<Props, Methods>,
    value: boolean
  ) => void;

  reset?: (
    this: ComponentHost<Props, Methods>
  ) => void;

  restore?: (
    this: ComponentHost<Props, Methods>,
    state: unknown,
    mode: string
  ) => void;

  methods?: Methods;
}

export interface SwapViewOptions {
  direction?: 'push' | 'pop' | 'replace' | string;
  params?: Record<string, string>;
}

export type ContainerHost<Props extends PropsDefinition = {}> =
  ComponentHost<Props> & {
    swapView(newElement: Element, options?: SwapViewOptions): Promise<void>;
  };

export type ContainerMountContext<
  Props extends PropsDefinition = {},
  Refs extends ElementRefs<Refs> = RefsMap
> = Omit<MountContext<Props, Refs, false>, 'el'> & {
  el: ContainerHost<Props>;
};

export interface ContainerSpec<
  Props extends PropsDefinition = {},
  Refs extends ElementRefs<Refs> = RefsMap
> extends Omit<
  ElementSpec<Props, Refs, false>,
  'mount' | 'update' | 'unmount' | 'form'
> {
  mount?: (
    context: ContainerMountContext<Props, Refs>
  ) => MaybePromise<void>;

  update?: (
    context: UpdateContext<Props, Refs, false>
  ) => MaybePromise<void>;

  unmount?: (
    context: UnmountContext<Props, Refs, false>
  ) => void;
}

export interface ObserveApi {
  resize(
    el: Element,
    fn: (entries: ResizeObserverEntry[]) => void,
    signal?: AbortSignal
  ): Disposer;

  intersection(
    el: Element,
    fn: (entries: IntersectionObserverEntry[]) => void,
    signal?: AbortSignal,
    options?: IntersectionObserverInit
  ): Disposer;

  mutation(
    el: Node,
    fn: (mutations: MutationRecord[]) => void,
    signal?: AbortSignal,
    options?: MutationObserverInit
  ): Disposer;

  performance(
    types: string[],
    fn: (list: PerformanceObserverEntryList) => void,
    signal?: AbortSignal,
    options?: PerformanceObserverInit
  ): Disposer;
}

export interface ViewTransitionLike<T = unknown> {
  finished: Promise<T>;
  updateCallbackDone: Promise<T>;
  ready: Promise<unknown>;
  skipTransition(): void;
}

export class BaseElement extends HTMLElement {
  ctrl: AbortController | null;

  constructor();
  connectedCallback(): void;
  disconnectedCallback(): void;
  mount(): void;
  unmount(): void;
}

export function define<TagName extends string>(
  tagName: TagName,
  elementClass: CustomElementConstructor
): void;

export function element<
  TagName extends string,
  Props extends PropsDefinition = {},
  Refs extends ElementRefs<Refs> = RefsMap,
  Form extends boolean = false,
  Methods extends Record<string, (...args: any[]) => any> = {}
>(
  tagName: TagName,
  spec: ElementSpec<Props, Refs, Form, Methods>,
  base?: string | URL
): void;

export function container<
  TagName extends string,
  Props extends PropsDefinition = {},
  Refs extends ElementRefs<Refs> = RefsMap
>(
  tagName: TagName,
  spec: ContainerSpec<Props, Refs>,
  base?: string | URL
): void;

export function schedule<T>(
  fn: () => T | Promise<T>,
  priority?: TaskPriority
): Promise<T>;

export function scheduleFrame<T>(fn: () => T): Promise<T>;

export function yieldTask(): Promise<void>;

/** SEO inputs for SSG / Mode B HTML head composition. */
export interface PageSeo {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
}

export interface PageConfig {
  tag: string;
  via?: string[];
  container?: string;
  template?: string | { html?: string; css?: string | string[]; shadow?: boolean };
  style?: string | string[];
  props?: PropsDefinition;
  params?: Array<{ name: string; type: PropConstructor }>;
  query?: Array<{ name: string; type: PropConstructor }>;
  guard?: (...args: any[]) => any;
  on?: Record<string, (...args: any[]) => any>;
  meta?: Record<string, unknown>;
  /** Build-time SEO for routes.json → SSG HTML. */
  seo?: PageSeo;
}

export function page(
  route: string | string[],
  config: PageConfig,
  base?: string | URL
): void;

export function dock(
  name: string,
  config?: {
    tag?: string;
    parent?: string;
    template?: { html?: string; css?: string; shadow?: boolean };
  },
  base?: string | URL
): void;

export function transition<T>(
  fn: () => T
): Promise<ViewTransitionLike<T>>;

export function template(
  strings: TemplateStringsArray,
  ...values: unknown[]
): DocumentFragment;

export const observe: ObserveApi;

export interface UiApi {
  define: typeof define;
  element: typeof element;
  container: typeof container;
  page: typeof page;
  dock: typeof dock;
  schedule: typeof schedule;
  scheduleFrame: typeof scheduleFrame;
  yield: typeof yieldTask;
  transition: typeof transition;
  template: typeof template;
  observe: ObserveApi;
}

export const ui: UiApi;
