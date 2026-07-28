/**
 * src/core/ui/index.js
 *
 * Public UI base entry point.
 * Aggregates BaseElement foundations, cooperative task scheduling, transition
 * orchestrators, templates, declarative element factory, and safe reactive element observers.
 *
 * Source: doc 04 — Web Components §1, doc 12 — Performance §2
 */

import { BaseElement } from './base.js';
import { define, element, container, page, dock, view, part } from './define/index.js';
import { schedule, scheduleFrame, yieldTask, Priority } from './schedule.js';
import {
  transition,
  runSwapTransition,
  configureTransitions,
  getTransitionConfig,
  prefersReducedMotion,
  shouldAnimate,
  dockTransitionName,
  skipHostTransition,
  hasDocumentViewTransition,
  hasElementViewTransition
} from './transitions.js';
import { template } from './template.js';
import * as observe from './observe.js';
import { theme } from '../theme/index.js';
import { getAttachmentStats } from './define/proxy.js';

export * from './defs/index.js';

export const ui = {
  define,
  element,
  container,
  page,
  dock,
  view,
  part,
  schedule,
  scheduleFrame,
  yield: yieldTask,
  Priority,
  transition,
  runSwapTransition,
  configureTransitions,
  getTransitionConfig,
  prefersReducedMotion,
  shouldAnimate,
  dockTransitionName,
  template,
  observe,
  theme,
  getAttachmentStats
};

export {
  BaseElement,
  define,
  element,
  container,
  page,
  dock,
  view,
  part,
  schedule,
  scheduleFrame,
  yieldTask,
  Priority,
  transition,
  runSwapTransition,
  configureTransitions,
  getTransitionConfig,
  prefersReducedMotion,
  shouldAnimate,
  dockTransitionName,
  skipHostTransition,
  hasDocumentViewTransition,
  hasElementViewTransition,
  template,
  observe,
  theme,
  getAttachmentStats
};
