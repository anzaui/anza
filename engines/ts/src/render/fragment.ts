import type { Engine } from '../engine/cache/engine.js';
import type { Params } from '../engine/slot/index.js';
import { Envelope } from '../models/envelope.js';

export async function renderFragmentEnvelope(
  engine: Engine,
  template: string,
  slot: string,
  params?: Params
): Promise<Envelope> {
  return engine.renderFragment(template, slot, params);
}
