import type { Template } from '../file/load.js';
import { AnzaError } from '../../errors/index.js';
import { validName } from '../name.js';

export class CacheStore {
  constructor(public templates: Map<string, Template> = new Map()) {}

  /**
   * Look `name` up in the cache. Malformed names are a `VALIDATION` error;
   * the filesystem is never touched.
   */
  get(name: string): Template {
    if (!validName(name)) throw AnzaError.validation('Invalid template name');
    const tpl = this.templates.get(name);
    if (!tpl) throw AnzaError.notFound(`Template '${name}' not found`);
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
