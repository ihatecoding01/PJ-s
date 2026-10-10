import { keccak256, toUtf8Bytes } from 'ethers';

/**
 * Produces a canonical JSON string:
 * - Keys sorted recursively in ascending lexicographical order
 * - No whitespace between keys, colons, or commas
 * - Normalizes undefined and null consistently
 * 
 * @param {any} val - Value to canonicalize
 * @returns {string} Canonical JSON string
 */
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

/**
 * Computes canonical hash: keccak256(utf8(canonicalJSON))
 * @param {any} data - Object or string to hash
 * @returns {string} 0x-prefixed 32-byte hex string (bytes32)
 */
export function canonicalHash(data) {
  if (typeof data === 'string' && data.startsWith('0x') && data.length === 66) {
    // Already a bytes32 hash
    return data;
  }
  const canonicalJson = canonicalStringify(data);
  const utf8Bytes = toUtf8Bytes(canonicalJson);
  return keccak256(utf8Bytes);
}

export default canonicalHash;
