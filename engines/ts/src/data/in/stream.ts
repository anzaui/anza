import { AnzaError } from '../../errors/index.js';
import type { Engine } from '../../engine/cache/engine.js';
import type { Params } from '../../engine/slot/index.js';
import type { Envelope } from '../../models/envelope.js';

export class Stream {
  constructor(
    public template: string,
    public slot: string,
    public params?: Params
  ) {}

  validate(): void {
    if (!this.template) {
      throw AnzaError.validation('Template cannot be empty');
    }
    if (!this.slot) {
      throw AnzaError.validation('Slot cannot be empty');
    }
  }

  async run(engine: Engine): Promise<Envelope> {
    this.validate();
    return engine.renderFragment(this.template, this.slot, this.params);
  }
}
