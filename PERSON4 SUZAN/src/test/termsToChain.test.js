import { describe, it, expect } from 'vitest';
import { termsToChain, PaymentModeEnum } from '../lib/termsToChain.js';
import { parseEther, getAddress } from 'ethers';

describe('termsToChain converter', () => {
  const sampleTerms = {
    schemaVersion: '1.0',
    title: 'Frontend Implementation',
    description: 'React dashboard development',
    client: '0x5eD39B1d5EF7962bb70c7Ac09F9016fE7a00E7E4',
    freelancer: '0x9908CAB15D339845c83775120F3f8373583Cc476',
    currency: 'MATIC',
    totalAmount: '2.5',
    paymentMode: 'MILESTONE',
    latePenaltyBpsPerDay: 150,
    maxLatePenaltyBps: 2500,
    reviewWindowDays: 4,
    graceDays: 2,
    maxRevisions: 3,
    github: { repoUrl: 'https://github.com/org/repo', branch: 'main' },
    milestones: [
      {
        index: 0,
        title: 'M1 UI Components',
        description: 'Design and build components',
        amount: '1.0',
        deadline: '2026-11-01T00:00:00.000Z',
        requiredProgressBps: 8000,
        acceptanceCriteria: ['Pass lint', 'Storybook updated']
      },
      {
        index: 1,
        title: 'M2 Integration',
        description: 'Web3 provider and contract calls',
        amount: '1.5',
        deadline: '2026-11-15T00:00:00.000Z',
        requiredProgressBps: 9000,
        acceptanceCriteria: ['All tests green']
      }
    ],
    createdAt: '2026-10-10T12:00:00.000Z'
  };

  it('converts terms to exact contract argument list', () => {
    const { args, named, totalWei } = termsToChain(sampleTerms);

    // 0: freelancer address
    expect(args[0]).toBe(getAddress(sampleTerms.freelancer));

    // 1: termsHash
    expect(args[1]).toMatch(/^0x[0-9a-fA-F]{64}$/);

    // 2: termsURI
    expect(typeof args[2]).toBe('string');

    // 3: mode (MILESTONE = 0)
    expect(args[3]).toBe(PaymentModeEnum.MILESTONE);

    // 4: latePenaltyBpsPerDay
    expect(args[4]).toBe(150);

    // 5: maxLatePenaltyBps
    expect(args[5]).toBe(2500);

    // 6: reviewWindow in seconds (4 days * 86400)
    expect(args[6]).toBe(4 * 86400);

    // 7: graceWindow in seconds (2 days * 86400)
    expect(args[7]).toBe(2 * 86400);

    // 8: maxRevisions
    expect(args[8]).toBe(3);

    // 9: amounts (1.0 ether and 1.5 ether)
    expect(args[9][0]).toBe(parseEther('1.0'));
    expect(args[9][1]).toBe(parseEther('1.5'));

    // 10: deadlines
    const expectedDeadline0 = BigInt(Math.floor(new Date('2026-11-01T00:00:00.000Z').getTime() / 1000));
    expect(args[10][0]).toBe(expectedDeadline0);

    // 11: requiredProgressBps
    expect(args[11][0]).toBe(8000);
    expect(args[11][1]).toBe(9000);

    // 12: criteriaHashes
    expect(args[12].length).toBe(2);
    expect(args[12][0]).toMatch(/^0x[0-9a-fA-F]{64}$/);

    // Total wei
    expect(totalWei).toBe(parseEther('2.5'));
  });

  it('handles LUMP_SUM payment mode properly', () => {
    const lumpTerms = {
      ...sampleTerms,
      paymentMode: 'LUMP_SUM'
    };
    const { args } = termsToChain(lumpTerms);
    expect(args[3]).toBe(PaymentModeEnum.LUMP_SUM);
  });

  it('throws an error if freelancer or milestones are missing', () => {
    expect(() => termsToChain({})).toThrow();
    expect(() => termsToChain({ freelancer: '0x123' })).toThrow();
  });
});
