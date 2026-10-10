import { describe, it, expect } from 'vitest';
import { canonicalStringify, canonicalHash } from '../lib/canonicalHash.js';
import { keccak256, toUtf8Bytes } from 'ethers';

describe('canonicalHash utility', () => {
  it('sorts keys recursively and strips whitespace', () => {
    const objA = { b: 2, a: 1 };
    const objB = { a: 1, b: 2 };
    
    expect(canonicalStringify(objA)).toBe('{"a":1,"b":2}');
    expect(canonicalStringify(objB)).toBe('{"a":1,"b":2}');
    expect(canonicalHash(objA)).toBe(canonicalHash(objB));
  });

  it('handles deeply nested objects with key sorting at every level', () => {
    const deep1 = {
      z: { beta: 'two', alpha: 'one' },
      m: [ { b: 2, a: 1 }, { d: 4, c: 3 } ],
      a: 'first'
    };
    const deep2 = {
      a: 'first',
      m: [ { a: 1, b: 2 }, { c: 3, d: 4 } ],
      z: { alpha: 'one', beta: 'two' }
    };

    expect(canonicalStringify(deep1)).toBe(canonicalStringify(deep2));
    expect(canonicalHash(deep1)).toBe(canonicalHash(deep2));
  });

  it('preserves array element order while canonicalizing object elements', () => {
    const arrA = [{ b: 2, a: 1 }, 'test', 42];
    expect(canonicalStringify(arrA)).toBe('[{"a":1,"b":2},"test",42]');
  });

  it('generates a valid 32-byte keccak256 hash', () => {
    const data = { hello: 'world' };
    const hash = canonicalHash(data);
    expect(hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    
    // Explicit verification against keccak256(utf8('{"hello":"world"}'))
    const expected = keccak256(toUtf8Bytes('{"hello":"world"}'));
    expect(hash).toBe(expected);
  });

  it('correctly hashes sample agreement terms', () => {
    const terms = {
      schemaVersion: '1.0',
      title: 'Smart Contract Audit',
      description: 'Audit core escrow contracts',
      client: '0x1111111111111111111111111111111111111111',
      freelancer: '0x2222222222222222222222222222222222222222',
      currency: 'MATIC',
      totalAmount: '1.5',
      paymentMode: 'MILESTONE',
      latePenaltyBpsPerDay: 100,
      maxLatePenaltyBps: 3000,
      reviewWindowDays: 5,
      graceDays: 3,
      maxRevisions: 2,
      github: { repoUrl: 'https://github.com/example/repo', branch: 'main' },
      milestones: [
        {
          index: 0,
          title: 'Milestone 1',
          description: 'Deliver initial report',
          amount: '1.5',
          deadline: '2026-11-01T00:00:00Z',
          requiredProgressBps: 8000,
          acceptanceCriteria: ['Tests pass', 'Code reviewed']
        }
      ],
      createdAt: '2026-10-10T00:00:00Z'
    };

    const hash = canonicalHash(terms);
    expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
  });
});
