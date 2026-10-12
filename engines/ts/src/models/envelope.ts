import { ENVELOPE_VERSION, signatureMessage } from '../crypto/envelope.js';

export interface EnvelopeData {
  /** Wire-format version, always 2 for envelopes this engine produces. */
  v: number;
  slot: string;
  ts: number;
  html: string;
  sig?: string;
  css?: string;
}

/** A rendered fragment on the wire (format v2, see `docs/engines/contract.md`). */
export class Envelope implements EnvelopeData {
  readonly v = ENVELOPE_VERSION;

  constructor(
    public slot: string,
    public ts: number,
    public html: string,
    public sig?: string,
    public css?: string
  ) {}

  /** The exact bytes the signature covers (v2, length-prefixed fields). */
  message(): Buffer {
    return signatureMessage(this.ts, this.slot, this.html, this.css);
  }

  toJSON(): EnvelopeData {
    const data: EnvelopeData = {
      v: this.v,
      slot: this.slot,
      ts: this.ts,
      html: this.html,
    };
    if (this.sig !== undefined) data.sig = this.sig;
    if (this.css !== undefined) data.css = this.css;
    return data;
  }
}
