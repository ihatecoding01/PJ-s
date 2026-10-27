// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// ── Custom Errors (4-byte selectors replace embedded string messages) ────────
error ErrInvalidFreelancer();
error ErrClientIsFreelancer();
error ErrNoMilestones();
error ErrArrayMismatch();
error ErrLumpSumSingle();
error ErrMaxPenaltyExceeded();
error ErrZeroAmount();
error ErrBpsExceeded();
error ErrDeadlinePast();
error ErrDeadlineOrder();
error ErrOnlyFreelancer();
error ErrNotDraft();
error ErrOnlyClient();
error ErrNotAwaitingFund();
error ErrWrongFundAmount();
error ErrOnlyParties();
error ErrNotCancellable();
error ErrNotActive();
error ErrBadIndex();
error ErrNotSubmittable();
error ErrMaxRevisions();
error ErrOnlyOracle();
error ErrNotSubmitted();
error ErrReviewPending();
error ErrEmptyHash();
error ErrGracePending();
error ErrDisputeWindowPending();
error ErrNotReclaimable();
error ErrTransferFailed();
error ErrAlreadyClosed();
error ErrBadAmendment();
error ErrAlreadyAccepted();
error ErrOnlyCounterparty();
error ErrNotDisputable();
error ErrNotDisputed();
error ErrShareExceeded();
error ErrVotingEnded();
error ErrNotArbitrator();
error ErrAlreadyVoted();
error ErrVotingPending();
error ErrAlreadyResolved();
error ErrBadAddress();
error ErrDuplicateArbitrator();
error ErrFeeExceeded();
error ErrWindowShort();
error ErrTooFewArbitrators();

/**
 * @title FairWork
 * @author Person 1 - Yash Naik (FairWork Monorepo)
 * @notice Milestone-based escrow agreement platform for blockchain freelancers and clients.
 * @dev Optimized for deployment size: custom errors, uint8 resolution method, lean loops.
 *      Integrates off-chain AI analysis with on-chain milestone escrow, penalty deductions,
 *      dispute resolution with arbitrator voting/AI fallback, and pull-over-push security.
 */
contract FairWork is ReentrancyGuard, Ownable, Pausable {
    // =========================================================================
    // ENUMS
    // =========================================================================

    enum AgreementStatus {
        Draft,
        AwaitingFunding,
        Active,
        Completed,
        Cancelled,
        Disputed
    }

    enum MilestoneStatus {
        Pending,
        Submitted,
        Approved,
        Rejected,
        Disputed,
        Paid,
        Refunded
    }

    enum PaymentMode {
        MILESTONE,
        LUMP_SUM
    }

    // =========================================================================
    // STRUCTS
    // =========================================================================

    struct Agreement {
        uint256 id;
        address client;
        address freelancer;
        bytes32 termsHash;
        string termsURI;
        PaymentMode mode;
        AgreementStatus status;
        uint256 totalAmount;
        uint16 latePenaltyBpsPerDay;
        uint16 maxLatePenaltyBps;
        uint32 reviewWindow;
        uint32 graceWindow;
        uint8 maxRevisions;
        uint64 createdAt;
    }

    struct Milestone {
        uint8 index;
        uint256 amount;
        uint64 deadline;
        uint16 requiredProgressBps;
        bytes32 criteriaHash;
        MilestoneStatus status;
        bytes32 submissionHash;
        string commitSha;
        uint64 submissionTime;
        uint64 rejectionTime;
        uint8 revisionsCount;
        uint16 aiProgressBps;
        bytes32 aiReportHash;
        uint256 paidAmount;
    }

    struct Amendment {
        uint256 amendmentId;
        uint8 milestoneIdx;
        address proposer;
        uint64 newDeadline;
        bytes32 newTermsHash;
        string newTermsURI;
        bool accepted;
        uint64 proposedAt;
    }

    struct Dispute {
        uint64 disputeRaisedTime;
        uint64 votingDeadline;
        address[3] selectedArbitrators;
        uint8 voteCount;
        uint16 aiFreelancerShareBps;
        bytes32 aiReportHash;
        bool hasAiRecommendation;
        bool resolved;
        uint16 finalFreelancerShareBps;
        uint8 resolutionMethod; // 0=UNRESOLVED, 1=VOTE, 2=AI_FALLBACK, 3=PROGRESS_FALLBACK
    }

    struct PaymentSummary {
        uint256 locked;
        uint256 released;
        uint256 disputed;
        uint256 refunded;
        uint256 feesPaid;
    }

    // =========================================================================
    // STATE VARIABLES
    // =========================================================================

    uint256 private _agreementCount;
    address public oracle;
    address payable public treasury;
    uint16 public feeBps; // platform fee in basis points (max 500 = 5%)
    uint32 public votingWindow = 3 days; // default dispute voting window

    // Arbitrator pool
    address[] public arbitratorPool;
    mapping(address => bool) public isArbitrator;

    // Agreement and milestone mappings
    mapping(uint256 => Agreement) private _agreements;
    mapping(uint256 => Milestone[]) private _milestones;
    mapping(uint256 => Amendment[]) private _amendments;
    mapping(uint256 => PaymentSummary) private _paymentSummaries;

    // Dispute mappings: agreementId => milestoneIdx => Dispute
    mapping(uint256 => mapping(uint8 => Dispute)) private _disputes;
    mapping(uint256 => mapping(uint8 => bytes32[])) private _disputeEvidence;
    mapping(uint256 => mapping(uint8 => mapping(address => bool))) private _hasVoted;
    mapping(uint256 => mapping(uint8 => mapping(address => uint16))) private _arbitratorVotes;
    mapping(uint256 => mapping(uint8 => uint16[])) private _disputeCastVotes;

    // =========================================================================
    // EVENTS
    // =========================================================================

    event AgreementCreated(
        uint256 indexed id,
        address indexed client,
        address indexed freelancer,
        bytes32 termsHash,
        string termsURI
    );
    event AgreementAccepted(uint256 indexed id);
    event AgreementFunded(uint256 indexed id, uint256 amount);
    event AgreementCancelled(uint256 indexed id);
    event AgreementCompleted(uint256 indexed id);

    event MilestoneSubmitted(
        uint256 indexed id,
        uint8 indexed idx,
        bytes32 submissionHash,
        string commitSha
    );
    event ProgressRecorded(
        uint256 indexed id,
        uint8 indexed idx,
        uint16 aiProgressBps,
        bytes32 aiReportHash
    );
    event MilestoneApproved(
        uint256 indexed id,
        uint8 indexed idx,
        bool isAuto
    );
    event MilestoneRejected(
        uint256 indexed id,
        uint8 indexed idx,
        bytes32 reasonHash
    );
    event MilestonePaid(
        uint256 indexed id,
        uint8 indexed idx,
        uint256 freelancerAmount,
        uint256 fee,
        uint256 penaltyRefund
    );
    event MilestoneRefunded(
        uint256 indexed id,
        uint8 indexed idx,
        uint256 amount
    );

    event AmendmentProposed(
        uint256 indexed id,
        uint8 indexed idx,
        uint256 amendmentId,
        address proposer,
        uint64 newDeadline,
        bytes32 newTermsHash,
        string newTermsURI
    );
    event AmendmentAccepted(uint256 indexed id, uint256 amendmentId);

    event DisputeRaised(
        uint256 indexed id,
        uint8 indexed idx,
        address indexed by,
        bytes32 evidenceHash
    );
    event EvidenceSubmitted(
        uint256 indexed id,
        uint8 indexed idx,
        address indexed by,
        bytes32 evidenceHash
    );
    event ArbitratorsSelected(
        uint256 indexed id,
        uint8 indexed idx,
        address[3] arbitrators
    );
    event VoteCast(
        uint256 indexed id,
        uint8 indexed idx,
        address indexed voter,
        uint16 freelancerShareBps
    );
    event AiRecommendationRecorded(
        uint256 indexed id,
        uint8 indexed idx,
        uint16 freelancerShareBps,
        bytes32 reportHash
    );
    event DisputeResolved(
        uint256 indexed id,
        uint8 indexed idx,
        uint16 freelancerShareBps,
        string method
    );

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    /**
     * @notice Initializes the FairWork escrow contract.
     * @dev Sets deployer as owner, treasury, and default oracle with a 1% (100 bps) platform fee.
     */
    constructor() Ownable(msg.sender) {
        treasury = payable(msg.sender);
        oracle = msg.sender;
        feeBps = 100; // default 100 bps = 1.00%
    }

    // =========================================================================
    // AGREEMENT LIFECYCLE FUNCTIONS
    // =========================================================================

    /**
     * @notice Creates a new agreement draft with milestones.
     * @dev Called by the client. Enforces non-zero amounts, matching array lengths,
     *      increasing deadlines, and single-milestone restriction for LUMP_SUM.
     */
    struct CreateAgreementParams {
        address freelancer;
        bytes32 termsHash;
        string termsURI;
        PaymentMode mode;
        uint16 latePenaltyBpsPerDay;
        uint16 maxLatePenaltyBps;
        uint32 reviewWindow;
        uint32 graceWindow;
        uint8 maxRevisions;
        uint256[] amounts;
        uint64[] deadlines;
        uint16[] requiredProgressBps;
        bytes32[] criteriaHashes;
    }

    function createAgreement(CreateAgreementParams calldata p)
        external
        whenNotPaused
        returns (uint256 id)
    {
        if (p.freelancer == address(0)) revert ErrInvalidFreelancer();
        if (p.freelancer == msg.sender) revert ErrClientIsFreelancer();
        if (p.amounts.length == 0) revert ErrNoMilestones();
        if (
            p.amounts.length != p.deadlines.length ||
            p.amounts.length != p.requiredProgressBps.length ||
            p.amounts.length != p.criteriaHashes.length
        ) revert ErrArrayMismatch();
        if (p.mode == PaymentMode.LUMP_SUM && p.amounts.length != 1)
            revert ErrLumpSumSingle();
        if (p.maxLatePenaltyBps > 10000) revert ErrMaxPenaltyExceeded();

        uint256 total;
        for (uint256 i; i < p.amounts.length; ) {
            if (p.amounts[i] == 0) revert ErrZeroAmount();
            if (p.requiredProgressBps[i] > 10000) revert ErrBpsExceeded();
            if (i == 0) {
                if (p.deadlines[i] <= block.timestamp) revert ErrDeadlinePast();
            } else {
                if (p.deadlines[i] <= p.deadlines[i - 1]) revert ErrDeadlineOrder();
            }
            total += p.amounts[i];
            unchecked { ++i; }
        }

        id = ++_agreementCount;

        _agreements[id] = Agreement({
            id: id,
            client: msg.sender,
            freelancer: p.freelancer,
            termsHash: p.termsHash,
            termsURI: p.termsURI,
            mode: p.mode,
            status: AgreementStatus.Draft,
            totalAmount: total,
            latePenaltyBpsPerDay: p.latePenaltyBpsPerDay,
            maxLatePenaltyBps: p.maxLatePenaltyBps,
            reviewWindow: p.reviewWindow,
            graceWindow: p.graceWindow,
            maxRevisions: p.maxRevisions,
            createdAt: uint64(block.timestamp)
        });

        _pushMilestones(id, p.amounts, p.deadlines, p.requiredProgressBps, p.criteriaHashes);

        emit AgreementCreated(id, msg.sender, p.freelancer, p.termsHash, p.termsURI);
    }

    function createAgreement(
        address freelancer,
        bytes32 termsHash,
        string calldata termsURI,
        PaymentMode mode,
        uint16 latePenaltyBpsPerDay,
        uint16 maxLatePenaltyBps,
        uint32 reviewWindow,
        uint32 graceWindow,
        uint8 maxRevisions,
        uint256[] calldata amounts,
        uint64[] calldata deadlines,
        uint16[] calldata requiredProgressBps,
        bytes32[] calldata criteriaHashes
    ) external whenNotPaused returns (uint256 id) {
        if (freelancer == address(0)) revert ErrInvalidFreelancer();
        if (freelancer == msg.sender) revert ErrClientIsFreelancer();
        if (amounts.length == 0) revert ErrNoMilestones();
        if (
            amounts.length != deadlines.length ||
            amounts.length != requiredProgressBps.length ||
            amounts.length != criteriaHashes.length
        ) revert ErrArrayMismatch();
        if (mode == PaymentMode.LUMP_SUM && amounts.length != 1)
            revert ErrLumpSumSingle();
        if (maxLatePenaltyBps > 10000) revert ErrMaxPenaltyExceeded();

        uint256 total;
        for (uint256 i; i < amounts.length; ) {
            if (amounts[i] == 0) revert ErrZeroAmount();
            if (requiredProgressBps[i] > 10000) revert ErrBpsExceeded();
            if (i == 0) {
                if (deadlines[i] <= block.timestamp) revert ErrDeadlinePast();
            } else {
                if (deadlines[i] <= deadlines[i - 1]) revert ErrDeadlineOrder();
            }
            total += amounts[i];
            unchecked { ++i; }
        }

        id = ++_agreementCount;

        _agreements[id] = Agreement({
            id: id,
            client: msg.sender,
            freelancer: freelancer,
            termsHash: termsHash,
            termsURI: termsURI,
            mode: mode,
            status: AgreementStatus.Draft,
            totalAmount: total,
            latePenaltyBpsPerDay: latePenaltyBpsPerDay,
            maxLatePenaltyBps: maxLatePenaltyBps,
            reviewWindow: reviewWindow,
            graceWindow: graceWindow,
            maxRevisions: maxRevisions,
            createdAt: uint64(block.timestamp)
        });

        _pushMilestones(id, amounts, deadlines, requiredProgressBps, criteriaHashes);

        emit AgreementCreated(id, msg.sender, freelancer, termsHash, termsURI);
    }

    function _pushMilestones(
        uint256 id,
        uint256[] calldata amounts,
        uint64[] calldata deadlines,
        uint16[] calldata requiredProgressBps,
        bytes32[] calldata criteriaHashes
    ) internal {
        for (uint8 i; i < amounts.length; ) {
            _milestones[id].push(
                Milestone({
                    index: i,
                    amount: amounts[i],
                    deadline: deadlines[i],
                    requiredProgressBps: requiredProgressBps[i],
                    criteriaHash: criteriaHashes[i],
                    status: MilestoneStatus.Pending,
                    submissionHash: bytes32(0),
                    commitSha: "",
                    submissionTime: 0,
                    rejectionTime: 0,
                    revisionsCount: 0,
                    aiProgressBps: 0,
                    aiReportHash: bytes32(0),
                    paidAmount: 0
                })
            );
            unchecked { ++i; }
        }
    }

    /**
     * @notice Freelancer accepts an agreement draft.
     * @dev Transitions agreement status from Draft to AwaitingFunding.
     * @param id The ID of the agreement.
     */
    function acceptAgreement(uint256 id) external whenNotPaused {
        Agreement storage ag = _agreements[id];
        if (msg.sender != ag.freelancer) revert ErrOnlyFreelancer();
        if (ag.status != AgreementStatus.Draft) revert ErrNotDraft();
        ag.status = AgreementStatus.AwaitingFunding;
        emit AgreementAccepted(id);
    }

    /**
     * @notice Client funds the agreement, locking native currency into escrow.
     * @dev msg.value must match the exact sum of all milestone amounts.
     * @param id The ID of the agreement.
     */
    function fundAgreement(uint256 id) external payable nonReentrant whenNotPaused {
        Agreement storage ag = _agreements[id];
        if (msg.sender != ag.client) revert ErrOnlyClient();
        if (ag.status != AgreementStatus.AwaitingFunding) revert ErrNotAwaitingFund();
        if (msg.value != ag.totalAmount) revert ErrWrongFundAmount();
        ag.status = AgreementStatus.Active;
        _paymentSummaries[id].locked = msg.value;
        emit AgreementFunded(id, msg.value);
    }

    /**
     * @notice Cancels an agreement before it is funded.
     * @dev Callable by either client or freelancer when Draft or AwaitingFunding.
     * @param id The ID of the agreement.
     */
    function cancelUnfunded(uint256 id) external whenNotPaused {
        Agreement storage ag = _agreements[id];
        if (msg.sender != ag.client && msg.sender != ag.freelancer)
            revert ErrOnlyParties();
        if (ag.status != AgreementStatus.Draft && ag.status != AgreementStatus.AwaitingFunding)
            revert ErrNotCancellable();
        ag.status = AgreementStatus.Cancelled;
        emit AgreementCancelled(id);
    }

    // =========================================================================
    // MILESTONE SUBMISSION AND ORACLE RECORDING
    // =========================================================================

    /**
     * @notice Freelancer submits work for a specific milestone.
     * @dev Starts the client review window timer.
     */
    function submitMilestone(
        uint256 id,
        uint8 idx,
        bytes32 submissionHash,
        string calldata commitSha
    ) external whenNotPaused {
        Agreement storage ag = _agreements[id];
        if (msg.sender != ag.freelancer) revert ErrOnlyFreelancer();
        if (ag.status != AgreementStatus.Active) revert ErrNotActive();
        if (idx >= _milestones[id].length) revert ErrBadIndex();

        Milestone storage m = _milestones[id][idx];
        if (m.status != MilestoneStatus.Pending && m.status != MilestoneStatus.Rejected)
            revert ErrNotSubmittable();

        if (m.status == MilestoneStatus.Rejected) {
            if (m.revisionsCount > ag.maxRevisions)
                revert ErrMaxRevisions();
        }

        m.submissionHash = submissionHash;
        m.commitSha = commitSha;
        m.submissionTime = uint64(block.timestamp);
        m.status = MilestoneStatus.Submitted;

        emit MilestoneSubmitted(id, idx, submissionHash, commitSha);
    }

    /**
     * @notice Backend oracle records AI progress evaluation for a submitted milestone.
     * @dev Advisory data used for transparency and dispute fallback.
     */
    function recordProgress(
        uint256 id,
        uint8 idx,
        uint16 aiProgressBps,
        bytes32 aiReportHash
    ) external whenNotPaused {
        if (msg.sender != oracle) revert ErrOnlyOracle();
        if (_agreements[id].status != AgreementStatus.Active) revert ErrNotActive();
        if (idx >= _milestones[id].length) revert ErrBadIndex();
        if (aiProgressBps > 10000) revert ErrBpsExceeded();

        Milestone storage m = _milestones[id][idx];
        if (m.status != MilestoneStatus.Submitted) revert ErrNotSubmitted();

        m.aiProgressBps = aiProgressBps;
        m.aiReportHash = aiReportHash;

        emit ProgressRecorded(id, idx, aiProgressBps, aiReportHash);
    }

    // =========================================================================
    // APPROVAL, PAYMENTS, REJECTIONS, AND RECLAIMS
    // =========================================================================

    /**
     * @notice Client manually approves a submitted milestone, releasing funds.
     */
    function approveMilestone(uint256 id, uint8 idx) external nonReentrant whenNotPaused {
        if (msg.sender != _agreements[id].client) revert ErrOnlyClient();
        _processPayout(id, idx, false);
    }

    /**
     * @notice Freelancer auto-claims milestone payout if the review window has elapsed.
     */
    function claimAfterReviewWindow(uint256 id, uint8 idx) external nonReentrant whenNotPaused {
        Agreement storage ag = _agreements[id];
        if (msg.sender != ag.freelancer) revert ErrOnlyFreelancer();
        Milestone storage m = _milestones[id][idx];
        if (block.timestamp < uint256(m.submissionTime) + ag.reviewWindow)
            revert ErrReviewPending();
        _processPayout(id, idx, true);
    }

    /**
     * @notice Client rejects a submitted milestone with a reason hash.
     */
    function rejectMilestone(
        uint256 id,
        uint8 idx,
        bytes32 reasonHash
    ) external whenNotPaused {
        Agreement storage ag = _agreements[id];
        if (msg.sender != ag.client) revert ErrOnlyClient();
        if (ag.status != AgreementStatus.Active) revert ErrNotActive();
        if (idx >= _milestones[id].length) revert ErrBadIndex();
        if (reasonHash == bytes32(0)) revert ErrEmptyHash();

        Milestone storage m = _milestones[id][idx];
        if (m.status != MilestoneStatus.Submitted) revert ErrNotSubmitted();

        m.status = MilestoneStatus.Rejected;
        m.rejectionTime = uint64(block.timestamp);
        m.revisionsCount++;

        emit MilestoneRejected(id, idx, reasonHash);
    }

    /**
     * @notice Client reclaims escrowed funds for a missed or unremedied milestone.
     */
    function reclaimMissedMilestone(uint256 id, uint8 idx) external nonReentrant whenNotPaused {
        Agreement storage ag = _agreements[id];
        if (msg.sender != ag.client) revert ErrOnlyClient();
        if (ag.status != AgreementStatus.Active) revert ErrNotActive();
        if (idx >= _milestones[id].length) revert ErrBadIndex();

        Milestone storage m = _milestones[id][idx];

        if (m.status == MilestoneStatus.Pending) {
            if (block.timestamp <= uint256(m.deadline) + ag.graceWindow)
                revert ErrGracePending();
        } else if (m.status == MilestoneStatus.Rejected) {
            if (block.timestamp <= uint256(m.rejectionTime) + ag.reviewWindow)
                revert ErrDisputeWindowPending();
        } else {
            revert ErrNotReclaimable();
        }

        uint256 amt = m.amount;
        _paymentSummaries[id].locked -= amt;
        _paymentSummaries[id].refunded += amt;

        m.status = MilestoneStatus.Refunded;

        emit MilestoneRefunded(id, idx, amt);

        (bool ok, ) = payable(ag.client).call{value: amt}("");
        if (!ok) revert ErrTransferFailed();

        _checkCompletion(id);
    }

    // =========================================================================
    // AMENDMENTS
    // =========================================================================

    /**
     * @notice Either party proposes an amendment to extend deadline or change terms.
     */
    function proposeAmendment(
        uint256 id,
        uint8 idx,
        uint64 newDeadline,
        bytes32 newTermsHash,
        string calldata newTermsURI
    ) external whenNotPaused {
        Agreement storage ag = _agreements[id];
        if (msg.sender != ag.client && msg.sender != ag.freelancer)
            revert ErrOnlyParties();
        if (ag.status != AgreementStatus.Active) revert ErrNotActive();
        if (idx >= _milestones[id].length) revert ErrBadIndex();

        Milestone storage m = _milestones[id][idx];
        if (m.status == MilestoneStatus.Paid || m.status == MilestoneStatus.Refunded)
            revert ErrAlreadyClosed();

        uint256 aid = _amendments[id].length;

        _amendments[id].push(
            Amendment({
                amendmentId: aid,
                milestoneIdx: idx,
                proposer: msg.sender,
                newDeadline: newDeadline,
                newTermsHash: newTermsHash,
                newTermsURI: newTermsURI,
                accepted: false,
                proposedAt: uint64(block.timestamp)
            })
        );

        emit AmendmentProposed(id, idx, aid, msg.sender, newDeadline, newTermsHash, newTermsURI);
    }

    /**
     * @notice Counterparty accepts a proposed amendment, updating agreement/milestone state.
     */
    function acceptAmendment(uint256 id, uint256 amendmentId) external whenNotPaused {
        Agreement storage ag = _agreements[id];
        if (ag.status != AgreementStatus.Active) revert ErrNotActive();
        if (amendmentId >= _amendments[id].length) revert ErrBadAmendment();

        Amendment storage a = _amendments[id][amendmentId];
        if (a.accepted) revert ErrAlreadyAccepted();

        if (a.proposer == ag.client) {
            if (msg.sender != ag.freelancer) revert ErrOnlyCounterparty();
        } else {
            if (msg.sender != ag.client) revert ErrOnlyCounterparty();
        }

        a.accepted = true;

        if (a.newDeadline > 0) {
            _milestones[id][a.milestoneIdx].deadline = a.newDeadline;
        }
        if (a.newTermsHash != bytes32(0)) {
            ag.termsHash = a.newTermsHash;
        }
        if (bytes(a.newTermsURI).length > 0) {
            ag.termsURI = a.newTermsURI;
        }

        emit AmendmentAccepted(id, amendmentId);
    }

    // =========================================================================
    // DISPUTE RESOLUTION
    // =========================================================================

    /**
     * @notice Raises a dispute on a submitted or rejected milestone, freezing its funds.
     * @dev Selects 3 distinct arbitrators pseudo-randomly from the arbitrator pool.
     *      Note: Uses block.prevrandao + block.timestamp as a hackathon simplification;
     *      Chainlink VRF is recommended for production.
     */
    function raiseDispute(
        uint256 id,
        uint8 idx,
        bytes32 evidenceHash
    ) external whenNotPaused {
        Agreement storage ag = _agreements[id];
        if (msg.sender != ag.client && msg.sender != ag.freelancer)
            revert ErrOnlyParties();
        if (ag.status != AgreementStatus.Active) revert ErrNotActive();
        if (idx >= _milestones[id].length) revert ErrBadIndex();

        Milestone storage m = _milestones[id][idx];
        if (m.status != MilestoneStatus.Submitted && m.status != MilestoneStatus.Rejected)
            revert ErrNotDisputable();

        m.status = MilestoneStatus.Disputed;

        // Shift funds from locked into disputed
        _paymentSummaries[id].locked -= m.amount;
        _paymentSummaries[id].disputed += m.amount;

        emit DisputeRaised(id, idx, msg.sender, evidenceHash);

        if (evidenceHash != bytes32(0)) {
            _disputeEvidence[id][idx].push(evidenceHash);
            emit EvidenceSubmitted(id, idx, msg.sender, evidenceHash);
        }

        // Pseudo-random selection of 3 distinct arbitrators excluding client & freelancer
        address[3] memory sel = _selectArbitrators(id, idx, ag.client, ag.freelancer);

        Dispute storage d = _disputes[id][idx];
        d.disputeRaisedTime = uint64(block.timestamp);
        d.votingDeadline = uint64(block.timestamp + votingWindow);
        d.selectedArbitrators = sel;

        emit ArbitratorsSelected(id, idx, sel);
    }

    /**
     * @notice Parties submit supplementary evidence hashes to an active dispute.
     */
    function submitEvidence(
        uint256 id,
        uint8 idx,
        bytes32 evidenceHash
    ) external whenNotPaused {
        Agreement storage ag = _agreements[id];
        if (msg.sender != ag.client && msg.sender != ag.freelancer)
            revert ErrOnlyParties();
        if (idx >= _milestones[id].length) revert ErrBadIndex();
        if (_milestones[id][idx].status != MilestoneStatus.Disputed)
            revert ErrNotDisputed();
        if (evidenceHash == bytes32(0)) revert ErrEmptyHash();

        _disputeEvidence[id][idx].push(evidenceHash);
        emit EvidenceSubmitted(id, idx, msg.sender, evidenceHash);
    }

    /**
     * @notice Oracle records advisory AI dispute recommendation.
     * @dev Used as fallback resolution if fewer than 2 arbitrators vote by the voting deadline.
     */
    function recordAiRecommendation(
        uint256 id,
        uint8 idx,
        uint16 freelancerShareBps,
        bytes32 reportHash
    ) external whenNotPaused {
        if (msg.sender != oracle) revert ErrOnlyOracle();
        if (idx >= _milestones[id].length) revert ErrBadIndex();
        if (_milestones[id][idx].status != MilestoneStatus.Disputed)
            revert ErrNotDisputed();
        if (freelancerShareBps > 10000) revert ErrShareExceeded();

        Dispute storage d = _disputes[id][idx];
        d.aiFreelancerShareBps = freelancerShareBps;
        d.aiReportHash = reportHash;
        d.hasAiRecommendation = true;

        emit AiRecommendationRecorded(id, idx, freelancerShareBps, reportHash);
    }

    /**
     * @notice Selected arbitrator casts their vote with a proposed freelancer payout percentage.
     */
    function castVote(
        uint256 id,
        uint8 idx,
        uint16 freelancerShareBps
    ) external whenNotPaused {
        if (idx >= _milestones[id].length) revert ErrBadIndex();
        if (_milestones[id][idx].status != MilestoneStatus.Disputed)
            revert ErrNotDisputed();
        if (freelancerShareBps > 10000) revert ErrShareExceeded();

        Dispute storage d = _disputes[id][idx];
        if (block.timestamp > d.votingDeadline) revert ErrVotingEnded();

        bool sel;
        for (uint256 i; i < 3; ) {
            if (d.selectedArbitrators[i] == msg.sender) { sel = true; break; }
            unchecked { ++i; }
        }
        if (!sel) revert ErrNotArbitrator();
        if (_hasVoted[id][idx][msg.sender]) revert ErrAlreadyVoted();

        _hasVoted[id][idx][msg.sender] = true;
        _arbitratorVotes[id][idx][msg.sender] = freelancerShareBps;
        _disputeCastVotes[id][idx].push(freelancerShareBps);
        d.voteCount++;

        emit VoteCast(id, idx, msg.sender, freelancerShareBps);
    }

    /**
     * @notice Finalizes a dispute after voting deadline (or once all 3 arbitrators voted).
     * @dev Resolution priority:
     *      1. If >= 2 votes cast: MEDIAN of cast votes (method: 1 = VOTE).
     *      2. If < 2 votes and AI recommendation recorded: AI recommendation (method: 2 = AI_FALLBACK).
     *      3. Otherwise: Milestone aiProgressBps (method: 3 = PROGRESS_FALLBACK).
     */
    function finalizeDispute(uint256 id, uint8 idx) external nonReentrant whenNotPaused {
        if (idx >= _milestones[id].length) revert ErrBadIndex();
        Milestone storage m = _milestones[id][idx];
        if (m.status != MilestoneStatus.Disputed) revert ErrNotDisputed();

        Dispute storage d = _disputes[id][idx];
        if (block.timestamp <= d.votingDeadline && d.voteCount != 3)
            revert ErrVotingPending();
        if (d.resolved) revert ErrAlreadyResolved();

        uint16 share;
        uint8 method;

        if (d.voteCount >= 2) {
            method = 1; // VOTE
            uint16[] storage votes = _disputeCastVotes[id][idx];
            if (votes.length == 2) {
                share = (votes[0] + votes[1]) / 2;
            } else {
                // Median of 3 votes
                uint16 a = votes[0];
                uint16 b = votes[1];
                uint16 c = votes[2];
                if (a > b) { (a, b) = (b, a); }
                if (b > c) { (b, c) = (c, b); }
                if (a > b) { (a, b) = (b, a); }
                share = b;
            }
        } else if (d.hasAiRecommendation) {
            method = 2; // AI_FALLBACK
            share = d.aiFreelancerShareBps;
        } else {
            method = 3; // PROGRESS_FALLBACK
            share = m.aiProgressBps;
        }

        if (share > 10000) share = 10000;

        d.resolved = true;
        d.finalFreelancerShareBps = share;
        d.resolutionMethod = method;

        uint256 total = m.amount;
        uint256 fGross = (total * share) / 10000;
        uint256 cPay = total - fGross;
        uint256 fee = (fGross * feeBps) / 10000;
        uint256 fPay = fGross - fee;

        // Accounting update
        _paymentSummaries[id].disputed -= total;
        _paymentSummaries[id].released += fPay;
        _paymentSummaries[id].refunded += cPay;
        _paymentSummaries[id].feesPaid += fee;

        m.paidAmount = fPay;
        m.status = MilestoneStatus.Paid;

        string memory methodStr = method == 1 ? "VOTE" : (method == 2 ? "AI_FALLBACK" : "PROGRESS_FALLBACK");
        emit DisputeResolved(id, idx, share, methodStr);

        Agreement storage ag = _agreements[id];

        // Safe pull-over-push / CEI transfers
        if (fPay > 0) {
            (bool ok, ) = payable(ag.freelancer).call{value: fPay}("");
            if (!ok) revert ErrTransferFailed();
        }
        if (cPay > 0) {
            (bool ok, ) = payable(ag.client).call{value: cPay}("");
            if (!ok) revert ErrTransferFailed();
        }
        if (fee > 0) {
            (bool ok, ) = payable(treasury).call{value: fee}("");
            if (!ok) revert ErrTransferFailed();
        }

        _checkCompletion(id);
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================

    /**
     * @notice Adds an address to the arbitrator pool.
     * @param arb Address of the new arbitrator.
     */
    function addArbitrator(address arb) external onlyOwner {
        if (arb == address(0)) revert ErrBadAddress();
        if (isArbitrator[arb]) revert ErrDuplicateArbitrator();
        isArbitrator[arb] = true;
        arbitratorPool.push(arb);
    }

    /**
     * @notice Removes an address from the arbitrator pool.
     * @param arb Address of the arbitrator to remove.
     */
    function removeArbitrator(address arb) external onlyOwner {
        if (!isArbitrator[arb]) revert ErrNotArbitrator();
        isArbitrator[arb] = false;
        for (uint256 i; i < arbitratorPool.length; ) {
            if (arbitratorPool[i] == arb) {
                arbitratorPool[i] = arbitratorPool[arbitratorPool.length - 1];
                arbitratorPool.pop();
                break;
            }
            unchecked { ++i; }
        }
    }

    /**
     * @notice Updates the backend oracle address.
     * @param _oracle New oracle address.
     */
    function setOracle(address _oracle) external onlyOwner {
        if (_oracle == address(0)) revert ErrBadAddress();
        oracle = _oracle;
    }

    /**
     * @notice Updates the protocol treasury address.
     * @param _treasury New payable treasury address.
     */
    function setTreasury(address payable _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ErrBadAddress();
        treasury = _treasury;
    }

    /**
     * @notice Sets protocol fee in basis points (max 500 = 5.00%).
     * @param _feeBps Fee basis points.
     */
    function setFeeBps(uint16 _feeBps) external onlyOwner {
        if (_feeBps > 500) revert ErrFeeExceeded();
        feeBps = _feeBps;
    }

    /**
     * @notice Updates the voting window duration for disputes.
     * @param _vw Window in seconds.
     */
    function setVotingWindow(uint32 _vw) external onlyOwner {
        if (_vw < 1 hours) revert ErrWindowShort();
        votingWindow = _vw;
    }

    /**
     * @notice Pauses contract interactions in case of emergency.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses contract interactions.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /**
     * @notice Retrieves agreement details.
     * @param id Agreement ID.
     */
    function getAgreement(uint256 id) external view returns (Agreement memory) {
        return _agreements[id];
    }

    /**
     * @notice Retrieves milestone details.
     * @param id Agreement ID.
     * @param idx Milestone index.
     */
    function getMilestone(uint256 id, uint8 idx) external view returns (Milestone memory) {
        if (idx >= _milestones[id].length) revert ErrBadIndex();
        return _milestones[id][idx];
    }

    /**
     * @notice Retrieves total number of milestones for an agreement.
     * @param id Agreement ID.
     */
    function getMilestoneCount(uint256 id) external view returns (uint256) {
        return _milestones[id].length;
    }

    struct DisputeView {
        uint64 disputeRaisedTime;
        uint64 disputeVotingDeadline;
        address[3] selectedArbitrators;
        uint8 voteCount;
        uint16 aiFreelancerShareBps;
        bytes32 aiReportHash;
        bool hasAiRecommendation;
        bool resolved;
        uint16 finalFreelancerShareBps;
        string resolutionMethod;
        bytes32[] evidenceHashes;
    }

    /**
     * @notice Retrieves dispute state and evidence for a milestone.
     * @param id Agreement ID.
     * @param idx Milestone index.
     */
    function getDispute(uint256 id, uint8 idx)
        external
        view
        returns (DisputeView memory)
    {
        Dispute storage d = _disputes[id][idx];
        DisputeView memory v;
        v.disputeRaisedTime = d.disputeRaisedTime;
        v.disputeVotingDeadline = d.votingDeadline;
        v.selectedArbitrators = d.selectedArbitrators;
        v.voteCount = d.voteCount;
        v.aiFreelancerShareBps = d.aiFreelancerShareBps;
        v.aiReportHash = d.aiReportHash;
        v.hasAiRecommendation = d.hasAiRecommendation;
        v.resolved = d.resolved;
        v.finalFreelancerShareBps = d.finalFreelancerShareBps;
        if (d.resolutionMethod == 1) v.resolutionMethod = "VOTE";
        else if (d.resolutionMethod == 2) v.resolutionMethod = "AI_FALLBACK";
        else if (d.resolutionMethod == 3) v.resolutionMethod = "PROGRESS_FALLBACK";
        else v.resolutionMethod = "";
        v.evidenceHashes = _disputeEvidence[id][idx];
        return v;
    }

    /**
     * @notice Retrieves the current payment summary accounting for an agreement.
     * @param id Agreement ID.
     */
    function getPaymentSummary(uint256 id)
        external
        view
        returns (
            uint256 locked,
            uint256 released,
            uint256 disputed,
            uint256 refunded,
            uint256 feesPaid
        )
    {
        PaymentSummary storage ps = _paymentSummaries[id];
        return (ps.locked, ps.released, ps.disputed, ps.refunded, ps.feesPaid);
    }

    /**
     * @notice Retrieves an amendment by index.
     * @param id Agreement ID.
     * @param amendmentId Amendment index.
     */
    function getAmendment(uint256 id, uint256 amendmentId)
        external
        view
        returns (Amendment memory)
    {
        if (amendmentId >= _amendments[id].length) revert ErrBadAmendment();
        return _amendments[id][amendmentId];
    }

    /**
     * @notice Retrieves count of proposed amendments for an agreement.
     * @param id Agreement ID.
     */
    function getAmendmentCount(uint256 id) external view returns (uint256) {
        return _amendments[id].length;
    }

    /**
     * @notice Retrieves full arbitrator pool array.
     */
    function getArbitratorPool() external view returns (address[] memory) {
        return arbitratorPool;
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    /**
     * @dev Internal milestone payout processing logic.
     */
    function _processPayout(uint256 id, uint8 idx, bool isAuto) internal {
        Agreement storage ag = _agreements[id];
        if (ag.status != AgreementStatus.Active) revert ErrNotActive();
        if (idx >= _milestones[id].length) revert ErrBadIndex();

        Milestone storage m = _milestones[id][idx];
        if (m.status != MilestoneStatus.Submitted) revert ErrNotSubmitted();

        // Lateness penalty calculation
        uint256 daysLate;
        if (m.submissionTime > m.deadline) {
            daysLate = (m.submissionTime - m.deadline) / 1 days;
        }

        uint256 penBps = daysLate * ag.latePenaltyBpsPerDay;
        if (penBps > ag.maxLatePenaltyBps) {
            penBps = ag.maxLatePenaltyBps;
        }

        uint256 penRefund = (m.amount * penBps) / 10000;
        uint256 afterPen = m.amount - penRefund;
        uint256 fee = (afterPen * feeBps) / 10000;
        uint256 fAmt = afterPen - fee;

        // Accounting update
        _paymentSummaries[id].locked -= m.amount;
        _paymentSummaries[id].released += fAmt;
        _paymentSummaries[id].refunded += penRefund;
        _paymentSummaries[id].feesPaid += fee;

        m.paidAmount = fAmt;
        m.status = MilestoneStatus.Paid;

        emit MilestoneApproved(id, idx, isAuto);
        emit MilestonePaid(id, idx, fAmt, fee, penRefund);

        // Safe payouts
        if (fAmt > 0) {
            (bool ok, ) = payable(ag.freelancer).call{value: fAmt}("");
            if (!ok) revert ErrTransferFailed();
        }
        if (penRefund > 0) {
            (bool ok, ) = payable(ag.client).call{value: penRefund}("");
            if (!ok) revert ErrTransferFailed();
        }
        if (fee > 0) {
            (bool ok, ) = payable(treasury).call{value: fee}("");
            if (!ok) revert ErrTransferFailed();
        }

        _checkCompletion(id);
    }

    /**
     * @dev Checks if all milestones are Paid or Refunded. If so, completes agreement.
     */
    function _checkCompletion(uint256 id) internal {
        Milestone[] storage ms = _milestones[id];
        for (uint256 i; i < ms.length; ) {
            if (ms[i].status != MilestoneStatus.Paid && ms[i].status != MilestoneStatus.Refunded)
                return;
            unchecked { ++i; }
        }
        if (_agreements[id].status != AgreementStatus.Completed) {
            _agreements[id].status = AgreementStatus.Completed;
            emit AgreementCompleted(id);
        }
    }

    /**
     * @dev Pseudo-randomly selects 3 distinct arbitrators from the pool,
     *      excluding client and freelancer.
     */
    function _selectArbitrators(
        uint256 id,
        uint8 idx,
        address client,
        address freelancer
    ) internal view returns (address[3] memory selected) {
        address[] memory eligible = new address[](arbitratorPool.length);
        uint256 cnt;

        for (uint256 i; i < arbitratorPool.length; ) {
            address arb = arbitratorPool[i];
            if (arb != client && arb != freelancer) {
                eligible[cnt] = arb;
                cnt++;
            }
            unchecked { ++i; }
        }

        if (cnt < 3) revert ErrTooFewArbitrators();

        uint256 seed = uint256(
            keccak256(
                abi.encodePacked(
                    block.difficulty,
                    block.timestamp,
                    id,
                    idx,
                    cnt
                )
            )
        );

        for (uint256 i; i < 3; ) {
            uint256 pick = i + (uint256(keccak256(abi.encodePacked(seed, i))) % (cnt - i));
            selected[i] = eligible[pick];
            eligible[pick] = eligible[i];
            unchecked { ++i; }
        }
    }
}
