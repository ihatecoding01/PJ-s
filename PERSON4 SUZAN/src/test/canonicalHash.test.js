import { describe, it, expect } from 'vitest';
import { canonicalStringify, canonicalHash, computeCanonicalHash } from '../lib/canonicalHash.js';
import { keccak256, toUtf8Bytes } from 'ethers';

// Test vectors from shared/test-vectors/canonical-hash.json
const TEST_VECTORS = [
  {
    name: "key_order_permutations",
    description: "Objects with keys in different order must yield identical canonical hash",
    input_a: { z: 1, a: 2, m: 3 },
    input_b: { a: 2, m: 3, z: 1 },
    canonicalJson: '{"a":2,"m":3,"z":1}',
    expectedHash: "0xc430eff553e48f85ee27e092fcbec540df75778b53c4ffb75dcaa805ba25ea57"
  },
  {
    name: "nested_arrays",
    description: "Multi-dimensional and nested arrays must maintain order while canonicalizing inner values",
    input: {
      list: [[1, 2], [3, 4]],
      title: "nested"
    },
    canonicalJson: '{"list":[[1,2],[3,4]],"title":"nested"}',
    expectedHash: "0x8a332b8e514d79263537c836d765e50f2a282196e6733cf1dc384185c8c787be"
  },
  {
    name: "unicode",
    description: "Unicode characters, multilingual text and emojis",
    input: {
      text: "FairWork 🌍 世界",
      emoji: "✨"
    },
    canonicalJson: '{"emoji":"✨","text":"FairWork 🌍 世界"}',
    expectedHash: "0x3e75f663ea0446ab618b358b41f44c7d1d9933b2dd1de3d75290cf47fb3a2233"
  },
  {
    name: "number_and_string",
    description: "Distinct representation between numbers (1.5) and string values ('1.5')",
    input: {
      amountNum: 1.5,
      amountStr: "1.5"
    },
    canonicalJson: '{"amountNum":1.5,"amountStr":"1.5"}',
    expectedHash: "0xac7640c9f506ea6b83d35c5a876b0267d4ecf3b30450184ea8e6ac1e9f99bec6"
  },
  {
    name: "empty_structures",
    description: "Empty arrays and empty objects serialized concisely",
    input: {
      emptyArr: [],
      emptyObj: {},
      flag: false
    },
    canonicalJson: '{"emptyArr":[],"emptyObj":{},"flag":false}',
    expectedHash: "0x50f598263a675ebc71659bc69af76cbd57597e54f0bd3d9c338b683c01f6ebc4"
  },
  {
    name: "deep_nested_objects",
    description: "Arbitrarily deep nested objects with unordered keys at all levels",
    input: {
      z: {
        c: 3,
        a: 1,
        b: {
          y: true,
          x: false
        }
      },
      a: {
        nested: []
      }
    },
    canonicalJson: '{"a":{"nested":[]},"z":{"a":1,"b":{"x":false,"y":true},"c":3}}',
    expectedHash: "0x99dc124c8d9ca4ec3d1c7012f622a52276efe904a50d40114402e85823478efb"
  }
];

describe('canonicalHash utility against shared test vectors', () => {
  for (const vector of TEST_VECTORS) {
    it(`passes vector: ${vector.name} (${vector.description})`, () => {
      if (vector.input_a && vector.input_b) {
        expect(canonicalStringify(vector.input_a)).toBe(vector.canonicalJson);
        expect(canonicalStringify(vector.input_b)).toBe(vector.canonicalJson);
        expect(canonicalHash(vector.input_a)).toBe(vector.expectedHash);
        expect(canonicalHash(vector.input_b)).toBe(vector.expectedHash);
      } else {
        expect(canonicalStringify(vector.input)).toBe(vector.canonicalJson);
        expect(canonicalHash(vector.input)).toBe(vector.expectedHash);
      }
    });
  }

  it('generates a valid 32-byte keccak256 hash', () => {
    const data = { hello: 'world' };
    const hash = canonicalHash(data);
    expect(hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
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
      currency: 'ETH',
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
