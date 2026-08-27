export interface EnvelopeData {
  slot: string;
  ts: number;
  html: string;
  sig?: string;
  css?: string;
}

export class Envelope implements EnvelopeData {
  constructor(
    public slot: string,
    public ts: number,
    public html: string,
    public sig?: string,
    public css?: string
  ) {}

  message(): string {
    return `${this.ts}:${this.slot}:${this.html}`;
  }

  toJSON(): EnvelopeData {
    const data: EnvelopeData = {
      slot: this.slot,
      ts: this.ts,
      html: this.html,
    };
    if (this.sig) data.sig = this.sig;
    if (this.css) data.css = this.css;
    return data;
  }
}
