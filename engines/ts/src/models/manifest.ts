export class Manifest {
  public templates: Record<string, string> = {};

  insert(name: string, digest: string): void {
    this.templates[name] = digest;
  }

  get(name: string): string | undefined {
    return this.templates[name];
  }
}
