export type ErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'TEMPLATE' | 'CRYPTO' | 'INTERNAL';

export class AnzaError extends Error {
  constructor(public code: ErrorCode, message: string) {
    super(`[Anza:${code}] ${message}`);
    this.name = 'AnzaError';
  }

  static validation(msg: string): AnzaError {
    return new AnzaError('VALIDATION', msg);
  }

  static notFound(msg: string): AnzaError {
    return new AnzaError('NOT_FOUND', msg);
  }

  static template(msg: string): AnzaError {
    return new AnzaError('TEMPLATE', msg);
  }

  static crypto(msg: string): AnzaError {
    return new AnzaError('CRYPTO', msg);
  }

  static internal(msg: string): AnzaError {
    return new AnzaError('INTERNAL', msg);
  }
}
