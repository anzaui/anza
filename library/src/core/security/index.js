/**
 * src/core/security/index.js
 *
 * Public security entry point.
 * Aggregates SubtleCrypto operations, HTML sanitizations, and Permissions API queries.
 *
 * Source: doc 15 — Security Architecture §1, §3
 */

import {
  uuid,
  hash,
  generateKey,
  deriveKey,
  encrypt,
  decrypt,
  seal,
  unseal,
  sign,
  verify
} from './crypto.js';
import { sanitize } from './sanitize.js';
import { query, watch } from './permissions.js';

export const security = {
  uuid,
  hash,
  generateKey,
  deriveKey,
  encrypt,
  decrypt,
  seal,
  unseal,
  sign,
  verify,
  sanitize,
  permission: query,
  watchPermission: watch
};

export {
  uuid,
  hash,
  generateKey,
  deriveKey,
  encrypt,
  decrypt,
  seal,
  unseal,
  sign,
  verify,
  sanitize,
  query as permission,
  watch as watchPermission
};
