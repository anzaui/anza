/**
 * types/core/security/index.d.ts
 *
 * TypeScript declarations for the platform security operations layer.
 */

export function uuid(): string;
export function hash(data: string | ArrayBuffer, algo?: string): Promise<ArrayBuffer>;
export function generateKey(algo?: string, usages?: KeyUsage[], extractable?: boolean): Promise<CryptoKey>;
export function deriveKey(password: string, salt: string | ArrayBuffer, iterations?: number): Promise<CryptoKey>;
export function encrypt(key: CryptoKey, data: string | ArrayBuffer): Promise<ArrayBuffer>;
export function decrypt(key: CryptoKey, combinedData: ArrayBuffer): Promise<ArrayBuffer>;
/** Encrypts text with AES-GCM and returns base64 (IV + ciphertext). */
export function seal(key: CryptoKey, text: string): Promise<string>;
/** Decrypts a base64 string produced by `seal`. */
export function unseal(key: CryptoKey, b64: string): Promise<string>;
export function sign(key: CryptoKey, data: string | ArrayBuffer): Promise<ArrayBuffer>;
export function verify(key: CryptoKey, signature: ArrayBuffer, data: string | ArrayBuffer): Promise<boolean>;

export function sanitize(html: string, config?: any): string;

export function permission(name: PermissionName): Promise<PermissionState>;
export function watchPermission(name: PermissionName, fn: (state: PermissionState) => void, signal?: AbortSignal): () => void;

export const security: {
  uuid: typeof uuid;
  hash: typeof hash;
  generateKey: typeof generateKey;
  deriveKey: typeof deriveKey;
  encrypt: typeof encrypt;
  decrypt: typeof decrypt;
  seal: typeof seal;
  unseal: typeof unseal;
  sign: typeof sign;
  verify: typeof verify;
  sanitize: typeof sanitize;
  permission: typeof permission;
  watchPermission: typeof watchPermission;
};
