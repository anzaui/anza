export class Document {
  constructor(public html: string) {}

  toString(): string {
    return this.html;
  }

  toUint8Array(): Uint8Array {
    return new TextEncoder().encode(this.html);
  }
}
