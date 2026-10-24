import { ethers } from 'ethers';

/**
 * TEMPORARY ADAPTER SPECIFICATION: CANONICAL HASHING
 * 
 * Note: The shared Common Context / Smart Contract hashing specification is not
 * yet published in the root repository by PERSON 1 (Smart Contracts).
 * 
 * This adapter guarantees strict determinism by:
 * 1. Recursively sorting all object keys lexicographically.
 * 2. Normalizing whitespace (no unneeded spaces/newlines).
 * 3. Hashing the UTF-8 encoded canonical JSON string with standard Ethereum keccak256.
 * 
 * When PERSON 1 supplies the official abi.encode or EIP-712 hashing schema,
 * update this module accordingly.
 */

export function toCanonicalJsonString(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const elements = obj.map((item) => toCanonicalJsonString(item));
    return `[${elements.join(',')}]`;
  }

  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => {
    const valStr = toCanonicalJsonString(obj[key]);
    return `"${key}":${valStr}`;
  });

  return `{${pairs.join(',')}}`;
}

export function computeCanonicalHash(data: any): string {
  const canonicalString = typeof data === 'string' ? data : toCanonicalJsonString(data);
  const utf8Bytes = ethers.toUtf8Bytes(canonicalString);
  return ethers.keccak256(utf8Bytes);
}

export function computeSha256(buffer: Buffer): string {
  return ethers.sha256(buffer);
}
