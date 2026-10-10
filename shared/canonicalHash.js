/**
 * FairWork Canonical JSON Hashing Reference Implementation (ESM)
 * Specification:
 * - Recursively sorts object keys in ascending lexicographical order
 * - Compact JSON stringification (no extraneous whitespace)
 * - Hashes UTF-8 encoded string using Ethereum Keccak-256 (0x-prefixed 64 hex characters)
 */

import { ethers } from 'ethers';

export function canonicalStringify(val) {
  if (val === null || val === undefined) {
    return 'null';
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return JSON.stringify(val);
  }
  if (typeof val === 'string') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    const items = val.map(item => canonicalStringify(item));
    return '[' + items.join(',') + ']';
  }
  if (typeof val === 'object') {
    const sortedKeys = Object.keys(val).sort();
    const pairs = [];
    for (const key of sortedKeys) {
      if (val[key] !== undefined) {
        pairs.push(JSON.stringify(key) + ':' + canonicalStringify(val[key]));
      }
    }
    return '{' + pairs.join(',') + '}';
  }
  return JSON.stringify(val);
}

export function computeCanonicalHash(data) {
  if (typeof data === 'string' && data.startsWith('0x') && data.length === 66) {
    return data;
  }
  const canonicalJson = typeof data === 'string' ? data : canonicalStringify(data);
  const utf8Bytes = ethers.toUtf8Bytes(canonicalJson);
  return ethers.keccak256(utf8Bytes);
}

export const canonicalHash = computeCanonicalHash;
export default computeCanonicalHash;
