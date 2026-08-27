import type { Template } from '../file/load.js';
import { AnzaError } from '../../errors/index.js';

export class CacheStore {
  constructor(public templates: Map<string, Template> = new Map()) {}

  get(name: string): Template {
    const tpl = this.templates.get(name);
    if (!tpl) {
      throw AnzaError.notFound(`Template '${name}' not found in cache`);
    }
    return tpl;
  }

  insert(name: string, template: Template): void {
    this.templates.set(name, template);
  }

  remove(name: string): boolean {
    return this.templates.delete(name);
  }

  has(name: string): boolean {
    return this.templates.has(name);
  }
}
