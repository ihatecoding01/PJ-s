import { parseEther, getAddress } from 'ethers';
import { canonicalHash } from './canonicalHash.js';

export const PaymentModeEnum = {
  MILESTONE: 0,
  LUMP_SUM: 1
};

export const AgreementStatusEnum = {
  0: 'Draft',
  1: 'AwaitingFunding',
  2: 'Active',
  3: 'Completed',
  4: 'Cancelled',
  5: 'Disputed'
};

export const MilestoneStatusEnum = {
  0: 'Pending',
  1: 'Submitted',
  2: 'Approved',
  3: 'Rejected',
  4: 'Disputed',
  5: 'Paid',
  6: 'Refunded'
};

/**
 * Converts AgreementTerms JSON into FairWork.createAgreement arguments
 * 
 * Signature:
 * createAgreement(
 *   address freelancer,
 *   bytes32 termsHash,
 *   string termsURI,
 *   PaymentMode mode,
 *   uint16 latePenaltyBpsPerDay,
 *   uint16 maxLatePenaltyBps,
 *   uint32 reviewWindow,
 *   uint32 graceWindow,
 *   uint8 maxRevisions,
 *   uint256[] amounts,
 *   uint64[] deadlines,
 *   uint16[] requiredProgressBps,
 *   bytes32[] criteriaHashes
 * ) returns (uint256 id)
 * 
 * @param {object} terms - Agreement terms JSON
 * @param {string} [customTermsURI] - Optional URI override
 * @returns {object} Formatted arguments array and named parameters
 */
export function termsToChain(terms, customTermsURI = '') {
  if (!terms) {
    throw new Error('Terms object is required');
  }
  if (!terms.freelancer) {
    throw new Error('Freelancer address is required in terms');
  }
  if (!terms.milestones || !terms.milestones.length) {
    throw new Error('At least one milestone is required in terms');
  }

  // 1. freelancer address (checksummed or valid address)
  const freelancer = getAddress(terms.freelancer);

  // 2. termsHash
  const termsHash = canonicalHash(terms);

  // 3. termsURI
  const termsURI = customTermsURI || terms.termsURI || `data:application/json;base64,${typeof btoa !== 'undefined' ? btoa(JSON.stringify(terms)) : Buffer.from(JSON.stringify(terms)).toString('base64')}`;

  // 4. mode: PaymentMode (0 = MILESTONE, 1 = LUMP_SUM)
  const mode = terms.paymentMode === 'LUMP_SUM' ? PaymentModeEnum.LUMP_SUM : PaymentModeEnum.MILESTONE;

  // 5. latePenaltyBpsPerDay (default 100 bps = 1%/day)
  const latePenaltyBpsPerDay = Number(terms.latePenaltyBpsPerDay ?? 100);

  // 6. maxLatePenaltyBps (default 3000 bps = 30%)
  const maxLatePenaltyBps = Number(terms.maxLatePenaltyBps ?? 3000);

  // 7. reviewWindow in seconds (days * 86400)
  const reviewWindow = Math.floor(Number(terms.reviewWindowDays ?? 5) * 86400);

  // 8. graceWindow in seconds (days * 86400)
  const graceWindow = Math.floor(Number(terms.graceDays ?? 3) * 86400);

  // 9. maxRevisions (uint8)
  const maxRevisions = Number(terms.maxRevisions ?? 2);

  // Milestone arrays
  const amounts = [];
  const deadlines = [];
  const requiredProgressBps = [];
  const criteriaHashes = [];
  let totalWei = 0n;

  for (const m of terms.milestones) {
    const amountWei = parseEther(String(m.amount));
    amounts.push(amountWei);
    totalWei += amountWei;

    // Deadline in unix seconds
    const deadlineSec = typeof m.deadline === 'number'
      ? BigInt(m.deadline)
      : BigInt(Math.floor(new Date(m.deadline).getTime() / 1000));
    deadlines.push(deadlineSec);

    requiredProgressBps.push(Number(m.requiredProgressBps ?? 8000));

    // Criteria hash
    const cHash = canonicalHash(m.acceptanceCriteria || []);
    criteriaHashes.push(cHash);
  }

  const args = [
    freelancer,
    termsHash,
    termsURI,
    mode,
    latePenaltyBpsPerDay,
    maxLatePenaltyBps,
    reviewWindow,
    graceWindow,
    maxRevisions,
    amounts,
    deadlines,
    requiredProgressBps,
    criteriaHashes
  ];

  return {
    args,
    named: {
      freelancer,
      termsHash,
      termsURI,
      mode,
      latePenaltyBpsPerDay,
      maxLatePenaltyBps,
      reviewWindow,
      graceWindow,
      maxRevisions,
      amounts,
      deadlines,
      requiredProgressBps,
      criteriaHashes,
      totalWei
    },
    termsHash,
    totalWei
  };
}

export default termsToChain;
