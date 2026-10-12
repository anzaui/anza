/**
 * types/core/animations/index.d.ts
 *
 * TypeScript declarations for the WAAPI animations and staggers layer.
 */

export interface StaggerGroup {
  animations: Animation[];
  cancel(): void;
  finish(): void;
  finished: Promise<Animation[]>;
}

export function animate(
  el: HTMLElement,
  animationInput: string | Keyframe[] | PropertyIndexedKeyframes,
  options?: KeyframeAnimationOptions & { signal?: AbortSignal }
): Animation;

export function stagger(
  elements: HTMLElement[] | NodeListOf<HTMLElement>,
  animationInput: string | Keyframe[] | PropertyIndexedKeyframes,
  options?: KeyframeAnimationOptions & { staggerDelay?: number; signal?: AbortSignal }
): StaggerGroup;

export function scroll(
  el: HTMLElement,
  animationInput: string | Keyframe[] | PropertyIndexedKeyframes,
  options?: any
): Animation;

export function view(
  el: HTMLElement,
  animationInput: string | Keyframe[] | PropertyIndexedKeyframes,
  options?: any
): Animation;

export type AnimationStep = [
  el: HTMLElement,
  animationInput: string | Keyframe[] | PropertyIndexedKeyframes,
  options?: KeyframeAnimationOptions & { signal?: AbortSignal }
];

/** Runs steps one after another; `finished` resolves when the last one ends. */
export function sequence(steps: AnimationStep[]): { finished: Promise<void> };

export type DurationToken = 'instant' | 'fast' | 'normal' | 'slow' | 'slower';
export type EaseToken = 'default' | 'in' | 'out' | 'in-out' | 'spring' | 'linear';

/** Reads `--duration-<name>` from the document (ms), with token fallbacks. */
export function duration(name?: DurationToken | (string & {})): number;
/** Reads `--ease-<name>` from the document, with token fallbacks. */
export function ease(name?: EaseToken | (string & {})): string;
/** True when the user prefers reduced motion. */
export function reduced(): boolean;

export const Timing: {
  readonly EASE: 'ease';
  readonly EASE_IN: 'ease-in';
  readonly EASE_OUT: 'ease-out';
  readonly EASE_IN_OUT: 'ease-in-out';
  readonly LINEAR: 'linear';
  readonly DEFAULT: string;
  readonly SMOOTH: string;
  readonly FAST: string;
  readonly SOFT: string;
  readonly BOUNCE: string;
  readonly SPRING: string;
};

export function timing(
  duration?: number,
  easing?: string,
  fill?: FillMode
): { duration: number; easing: string; fill: FillMode };

export function keyframes(
  type: 'fade' | 'slide' | 'scale' | 'zoom' | 'blur' | (string & {}),
  options?: { from?: unknown; to?: unknown; axis?: 'x' | 'y' | (string & {}) }
): Keyframe[];

export const registry: {
  register(name: string, keyframes: Keyframe[] | PropertyIndexedKeyframes, options?: KeyframeAnimationOptions): void;
  get(name: string): { keyframes: Keyframe[] | PropertyIndexedKeyframes; options: KeyframeAnimationOptions } | null;
};

export const animations: {
  register: typeof registry.register;
  animate: typeof animate;
  stagger: typeof stagger;
  scroll: typeof scroll;
  sequence: typeof sequence;
  view: typeof view;
  Timing: typeof Timing;
  timing: typeof timing;
  keyframes: typeof keyframes;
  duration: typeof duration;
  ease: typeof ease;
  reduced: typeof reduced;
};
