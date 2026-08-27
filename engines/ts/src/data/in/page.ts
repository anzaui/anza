import { AnzaError } from '../../errors/index.js';
import type { Engine } from '../../engine/cache/engine.js';
import type { Params } from '../../engine/slot/index.js';
import type { Document } from '../../models/document.js';

export class Page {
  constructor(public route: string, public params?: Params) {}

  validate(): void {
    if (!this.route) {
      throw AnzaError.validation('Route cannot be empty');
    }
  }

  async run(engine: Engine): Promise<Document> {
    this.validate();
    return engine.renderPage(this.route, this.params);
  }
}
