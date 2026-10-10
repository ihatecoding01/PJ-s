# FairWork Common Context & Frozen Specification

## 1. System Overview & Monorepo Architecture
FairWork is a decentralized freelance agreement platform with milestone escrow, AI-assisted verification, and decentralized arbitrator voting.

### Service Ports & Directory Map
- **Contracts (`PERSON1 YASH NAIK/contracts`)**: Hardhat node on port `8545` (Chain ID `31337`).
- **AI Service (`PERSON3 YASHDEEP`)**: FastAPI on port `8000`.
- **Backend (`PERSON2 DHRUV/backend`)**: Express.js + Prisma (SQLite) on port `4000`.
- **Frontend (`PERSON4 SUZAN`)**: Vite + React on port `5173`.
- **Shared (`shared/`)**: Contract ABI, deployments, schemas, test vectors, reference canonical hash.

---

## 2. Smart Contract Interface (`FairWork.sol`)

### Enums
- `AgreementStatus`: `Draft (0)`, `AwaitingFunding (1)`, `Active (2)`, `Completed (3)`, `Cancelled (4)`, `Disputed (5)`
- `MilestoneStatus`: `Pending (0)`, `Submitted (1)`, `Approved (2)`, `Rejected (3)`, `Disputed (4)`, `Paid (5)`, `Refunded (6)`
- `PaymentMode`: `MILESTONE (0)`, `LUMP_SUM (1)`

### Structs
- `Agreement`: `(uint256 id, address client, address freelancer, bytes32 termsHash, string termsURI, PaymentMode mode, AgreementStatus status, uint256 totalAmount, uint16 latePenaltyBpsPerDay, uint16 maxLatePenaltyBps, uint32 reviewWindow, uint32 graceWindow, uint8 maxRevisions, uint64 createdAt)`
- `Milestone`: `(uint8 index, uint256 amount, uint64 deadline, uint16 requiredProgressBps, bytes32 criteriaHash, MilestoneStatus status, bytes32 submissionHash, string commitSha, uint64 submissionTime, uint64 rejectionTime, uint8 revisionsCount, uint16 aiProgressBps, bytes32 aiReportHash, uint256 paidAmount)`
- `Amendment`: `(uint256 amendmentId, uint8 milestoneIdx, address proposer, uint64 newDeadline, bytes32 newTermsHash, string newTermsURI, bool accepted, uint64 proposedAt)`
- `Dispute`: `(uint64 disputeRaisedTime, uint64 votingDeadline, address[3] selectedArbitrators, uint8 voteCount, uint16 aiFreelancerShareBps, bytes32 aiReportHash, bool hasAiRecommendation, bool resolved, uint16 finalFreelancerShareBps, string resolutionMethod)`
- `PaymentSummary`: `(uint256 locked, uint256 released, uint256 disputed, uint256 refunded, uint256 feesPaid)`

### Core Write Functions
- `createAgreement(address freelancer, bytes32 termsHash, string termsURI, PaymentMode mode, uint16 latePenaltyBpsPerDay, uint16 maxLatePenaltyBps, uint32 reviewWindow, uint32 graceWindow, uint8 maxRevisions, uint256[] amounts, uint64[] deadlines, uint16[] requiredProgressBps, bytes32[] criteriaHashes) returns (uint256)`
- `acceptAgreement(uint256 id)`
- `fundAgreement(uint256 id) payable`
- `cancelUnfunded(uint256 id)`
- `submitMilestone(uint256 id, uint8 idx, bytes32 submissionHash, string commitSha)`
- `recordProgress(uint256 id, uint8 idx, uint16 aiProgressBps, bytes32 aiReportHash)` (Oracle only)
- `approveMilestone(uint256 id, uint8 idx)`
- `claimAfterReviewWindow(uint256 id, uint8 idx)`
- `rejectMilestone(uint256 id, uint8 idx, bytes32 reasonHash)`
- `reclaimMissedMilestone(uint256 id, uint8 idx)`
- `proposeAmendment(uint256 id, uint8 idx, uint64 newDeadline, bytes32 newTermsHash, string newTermsURI)`
- `acceptAmendment(uint256 id, uint256 amendmentId)`
- `raiseDispute(uint256 id, uint8 idx, bytes32 evidenceHash)`
- `submitEvidence(uint256 id, uint8 idx, bytes32 evidenceHash)`
- `recordAiRecommendation(uint256 id, uint8 idx, uint16 freelancerShareBps, bytes32 reportHash)` (Oracle only)
- `castVote(uint256 id, uint8 idx, uint16 freelancerShareBps)` (Selected Arbitrator only)
- `finalizeDispute(uint256 id, uint8 idx)`

### Admin & View Functions
- `addArbitrator(address arbitrator)`
- `removeArbitrator(address arbitrator)`
- `setOracle(address _oracle)`
- `setTreasury(address payable _treasury)`
- `setFeeBps(uint16 _feeBps)` (Max 500 bps = 5%)
- `pause()` / `unpause()`
- `getAgreement(uint256 id)`
- `getMilestone(uint256 id, uint8 idx)`
- `getMilestoneCount(uint256 id)`
- `getDispute(uint256 id, uint8 idx)`
- `getPaymentSummary(uint256 id)`
- `getAmendment(uint256 id, uint256 amendmentId)`
- `getAmendmentCount(uint256 id)`
- `getArbitratorPool()`

### Events
- `AgreementCreated(uint256 indexed id, address indexed client, address indexed freelancer, bytes32 termsHash, string termsURI)`
- `AgreementAccepted(uint256 indexed id)`
- `AgreementFunded(uint256 indexed id, uint256 amount)`
- `AgreementCancelled(uint256 indexed id)`
- `AgreementCompleted(uint256 indexed id)`
- `MilestoneSubmitted(uint256 indexed id, uint8 indexed idx, bytes32 submissionHash, string commitSha)`
- `ProgressRecorded(uint256 indexed id, uint8 indexed idx, uint16 aiProgressBps, bytes32 aiReportHash)`
- `MilestoneApproved(uint256 indexed id, uint8 indexed idx, bool isAuto)`
- `MilestoneRejected(uint256 indexed id, uint8 indexed idx, bytes32 reasonHash)`
- `MilestonePaid(uint256 indexed id, uint8 indexed idx, uint256 freelancerAmount, uint256 fee, uint256 penaltyRefund)`
- `MilestoneRefunded(uint256 indexed id, uint8 indexed idx, uint256 amount)`
- `AmendmentProposed(uint256 indexed id, uint8 indexed idx, uint256 amendmentId, address proposer, uint64 newDeadline, bytes32 newTermsHash, string newTermsURI)`
- `AmendmentAccepted(uint256 indexed id, uint256 amendmentId)`
- `DisputeRaised(uint256 indexed id, uint8 indexed idx, address indexed by, bytes32 evidenceHash)`
- `EvidenceSubmitted(uint256 indexed id, uint8 indexed idx, address indexed by, bytes32 evidenceHash)`
- `ArbitratorsSelected(uint256 indexed id, uint8 indexed idx, address[3] arbitrators)`
- `VoteCast(uint256 indexed id, uint8 indexed idx, address indexed voter, uint16 freelancerShareBps)`
- `AiRecommendationRecorded(uint256 indexed id, uint8 indexed idx, uint16 freelancerShareBps, bytes32 reportHash)`
- `DisputeResolved(uint256 indexed id, uint8 indexed idx, uint16 freelancerShareBps, string method)`

---

## 3. Financial Invariants & Mathematical Formulas

1. **Accounting Invariant:**
   At all times: `locked + released + disputed + refunded + feesPaid == totalFunded`

2. **Late Penalty Formula:**
   $$\text{daysLate} = \lfloor (\text{submissionTime} - \text{deadline}) / 86400 \rfloor \quad (\text{if } \text{submissionTime} > \text{deadline}, \text{else } 0)$$
   $$\text{penaltyBps} = \min(\text{daysLate} \times \text{latePenaltyBpsPerDay}, \text{maxLatePenaltyBps})$$
   $$\text{penaltyRefund} = \frac{M \times \text{penaltyBps}}{10000}$$
   $$\text{amountAfterPenalty} = M - \text{penaltyRefund}$$
   $$\text{fee} = \frac{\text{amountAfterPenalty} \times \text{feeBps}}{10000}$$
   $$\text{freelancerAmount} = \text{amountAfterPenalty} - \text{fee}$$

3. **Dispute Resolution:**
   - 3 votes cast: Median vote value
   - 2 votes cast: Median (average or middle sorted)
   - < 2 votes: Fallback to AI recommendation (`aiFreelancerShareBps`), else `aiProgressBps`

---

## 4. Canonical Hashing Specification
1. Normalize and recursively sort object keys alphabetically.
2. Arrays maintain strict order; items inside are recursively canonicalized.
3. Serialize to compact JSON without whitespace: `JSON.stringify(normalized)`.
4. UTF-8 encode and compute Ethereum Keccak-256 (`0x` prefixed, 64 hex characters).
