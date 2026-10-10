// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title FairWork
 * @author Person 1 - Yash Naik (FairWork Monorepo)
 * @notice Milestone-based escrow agreement platform for blockchain freelancers and clients.
 * @dev Integrates off-chain AI analysis with on-chain milestone escrow, penalty deductions,
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
        string resolutionMethod;
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
    uint16 public feeBps; // platform fee in basis points (max 500 = 5%, default 100 = 1%)
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
     * @param freelancer Address of the designated freelancer.
     * @param termsHash Keccak256 hash of the canonical terms JSON.
     * @param termsURI IPFS or storage URI pointing to the agreement terms.
     * @param mode PaymentMode (MILESTONE or LUMP_SUM).
     * @param latePenaltyBpsPerDay Penalty in basis points deducted per day of delay.
     * @param maxLatePenaltyBps Cap on late penalty in basis points (max 10000).
     * @param reviewWindow Time window in seconds for client review.
     * @param graceWindow Grace period in seconds after milestone deadline before reclaim.
     * @param maxRevisions Maximum number of revisions allowed for rejected milestones.
     * @param amounts Array of payment amounts for each milestone in wei.
     * @param deadlines Array of unix timestamps representing deadlines for each milestone.
     * @param requiredProgressBps Array of required progress percentages (bps) for milestones.
     * @param criteriaHashes Array of hashes for milestone acceptance criteria.
     * @return id Unique identifier of the newly created agreement.
     */
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
        require(freelancer != address(0), "Invalid freelancer");
        require(freelancer != msg.sender, "Client cannot be freelancer");
        require(amounts.length > 0, "No milestones provided");
        require(
            amounts.length == deadlines.length &&
            amounts.length == requiredProgressBps.length &&
            amounts.length == criteriaHashes.length,
            "Array length mismatch"
        );
        if (mode == PaymentMode.LUMP_SUM) {
            require(amounts.length == 1, "LUMP_SUM requires exactly 1 milestone");
        }
        require(maxLatePenaltyBps <= 10000, "Max late penalty > 10000 bps");

        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Milestone amount must be > 0");
            require(requiredProgressBps[i] <= 10000, "Progress bps > 10000");
            if (i == 0) {
                require(deadlines[i] > block.timestamp, "First deadline must be future");
            } else {
                require(deadlines[i] > deadlines[i - 1], "Deadlines must be increasing");
            }
            total += amounts[i];
        }

        _agreementCount++;
        id = _agreementCount;

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

        for (uint8 i = 0; i < amounts.length; i++) {
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
        }

        emit AgreementCreated(id, msg.sender, freelancer, termsHash, termsURI);
        return id;
    }

    /**
     * @notice Freelancer accepts an agreement draft.
     * @dev Transitions agreement status from Draft to AwaitingFunding.
     * @param id The ID of the agreement.
     */
    function acceptAgreement(uint256 id) external whenNotPaused {
        Agreement storage agreement = _agreements[id];
        require(msg.sender == agreement.freelancer, "Only freelancer can accept");
        require(agreement.status == AgreementStatus.Draft, "Agreement not in Draft");

        agreement.status = AgreementStatus.AwaitingFunding;
        emit AgreementAccepted(id);
    }

    /**
     * @notice Client funds the agreement, locking native currency into escrow.
     * @dev msg.value must match the exact sum of all milestone amounts.
     *      Transitions agreement status to Active.
     * @param id The ID of the agreement.
     */
    function fundAgreement(uint256 id) external payable nonReentrant whenNotPaused {
        Agreement storage agreement = _agreements[id];
        require(msg.sender == agreement.client, "Only client can fund");
        require(agreement.status == AgreementStatus.AwaitingFunding, "Agreement not awaiting funding");
        require(msg.value == agreement.totalAmount, "Must fund exact total amount");

        agreement.status = AgreementStatus.Active;
        _paymentSummaries[id].locked = msg.value;

        emit AgreementFunded(id, msg.value);
    }

    /**
     * @notice Cancels an agreement before it is funded.
     * @dev Callable by either client or freelancer when Draft or AwaitingFunding.
     *      No funds are locked, so nothing is refunded.
     * @param id The ID of the agreement.
     */
    function cancelUnfunded(uint256 id) external whenNotPaused {
        Agreement storage agreement = _agreements[id];
        require(
            msg.sender == agreement.client || msg.sender == agreement.freelancer,
            "Only client or freelancer can cancel"
        );
        require(
            agreement.status == AgreementStatus.Draft ||
                agreement.status == AgreementStatus.AwaitingFunding,
            "Agreement already funded or finalized"
        );

        agreement.status = AgreementStatus.Cancelled;
        emit AgreementCancelled(id);
    }

    // =========================================================================
    // MILESTONE SUBMISSION AND ORACLE RECORDING
    // =========================================================================

    /**
     * @notice Freelancer submits work for a specific milestone.
     * @dev Starts the client review window timer. Can be called on Pending or Rejected milestone
     *      as long as revisionsCount <= maxRevisions.
     * @param id The ID of the agreement.
     * @param idx Index of the milestone.
     * @param submissionHash Keccak256 hash of submission metadata / evidence.
     * @param commitSha Git commit SHA or PR URL of the submitted work.
     */
    function submitMilestone(
        uint256 id,
        uint8 idx,
        bytes32 submissionHash,
        string calldata commitSha
    ) external whenNotPaused {
        Agreement storage agreement = _agreements[id];
        require(msg.sender == agreement.freelancer, "Only freelancer can submit");
        require(agreement.status == AgreementStatus.Active, "Agreement not active");
        require(idx < _milestones[id].length, "Invalid milestone index");

        Milestone storage milestone = _milestones[id][idx];
        require(
            milestone.status == MilestoneStatus.Pending ||
                milestone.status == MilestoneStatus.Rejected,
            "Milestone not submittable"
        );

        if (milestone.status == MilestoneStatus.Rejected) {
            require(
                milestone.revisionsCount <= agreement.maxRevisions,
                "Max revisions exceeded"
            );
        }

        milestone.submissionHash = submissionHash;
        milestone.commitSha = commitSha;
        milestone.submissionTime = uint64(block.timestamp);
        milestone.status = MilestoneStatus.Submitted;

        emit MilestoneSubmitted(id, idx, submissionHash, commitSha);
    }

    /**
     * @notice Backend oracle records AI progress evaluation for a submitted milestone.
     * @dev Advisory data used for transparency and dispute fallback.
     * @param id The ID of the agreement.
     * @param idx Index of the milestone.
     * @param aiProgressBps Evaluated progress percentage in basis points (0-10000).
     * @param aiReportHash Keccak256 hash of the canonical AI analysis report JSON.
     */
    function recordProgress(
        uint256 id,
        uint8 idx,
        uint16 aiProgressBps,
        bytes32 aiReportHash
    ) external whenNotPaused {
        require(msg.sender == oracle, "Only oracle can record progress");
        require(_agreements[id].status == AgreementStatus.Active, "Agreement not active");
        require(idx < _milestones[id].length, "Invalid milestone index");
        require(aiProgressBps <= 10000, "Progress bps > 10000");

        Milestone storage milestone = _milestones[id][idx];
        require(milestone.status == MilestoneStatus.Submitted, "Milestone not submitted");

        milestone.aiProgressBps = aiProgressBps;
        milestone.aiReportHash = aiReportHash;

        emit ProgressRecorded(id, idx, aiProgressBps, aiReportHash);
    }

    // =========================================================================
    // APPROVAL, PAYMENTS, REJECTIONS, AND RECLAIMS
    // =========================================================================

    /**
     * @notice Client manually approves a submitted milestone, releasing funds.
     * @dev Calculates and deducts lateness penalties (refunded to client) and platform fees
     *      (sent to treasury). Freelancer receives remainder.
     * @param id The ID of the agreement.
     * @param idx Index of the milestone.
     */
    function approveMilestone(uint256 id, uint8 idx) external nonReentrant whenNotPaused {
        Agreement storage agreement = _agreements[id];
        require(msg.sender == agreement.client, "Only client can approve");
        _processPayout(id, idx, false);
    }

    /**
     * @notice Freelancer auto-claims milestone payout if the review window has elapsed with silence.
     * @dev Applies identical lateness penalty and platform fee calculation.
     * @param id The ID of the agreement.
     * @param idx Index of the milestone.
     */
    function claimAfterReviewWindow(uint256 id, uint8 idx) external nonReentrant whenNotPaused {
        Agreement storage agreement = _agreements[id];
        require(msg.sender == agreement.freelancer, "Only freelancer can claim");
        Milestone storage milestone = _milestones[id][idx];
        require(
            block.timestamp >= uint256(milestone.submissionTime) + agreement.reviewWindow,
            "Review window has not elapsed"
        );
        _processPayout(id, idx, true);
    }

    /**
     * @notice Client rejects a submitted milestone with a reason hash.
     * @dev Increments revisions count and starts dispute/remedy timer.
     * @param id The ID of the agreement.
     * @param idx Index of the milestone.
     * @param reasonHash Keccak256 hash of the rejection feedback explanation.
     */
    function rejectMilestone(
        uint256 id,
        uint8 idx,
        bytes32 reasonHash
    ) external whenNotPaused {
        Agreement storage agreement = _agreements[id];
        require(msg.sender == agreement.client, "Only client can reject");
        require(agreement.status == AgreementStatus.Active, "Agreement not active");
        require(idx < _milestones[id].length, "Invalid milestone index");
        require(reasonHash != bytes32(0), "Reason hash cannot be empty");

        Milestone storage milestone = _milestones[id][idx];
        require(milestone.status == MilestoneStatus.Submitted, "Milestone not submitted");

        milestone.status = MilestoneStatus.Rejected;
        milestone.rejectionTime = uint64(block.timestamp);
        milestone.revisionsCount++;

        emit MilestoneRejected(id, idx, reasonHash);
    }

    /**
     * @notice Client reclaims escrowed funds for a missed or unremedied milestone.
     * @dev Allowed if:
     *      1) Milestone is Pending and deadline + graceWindow has passed.
     *      2) Milestone is Rejected and rejectionTime + reviewWindow has passed without resubmission or dispute.
     * @param id The ID of the agreement.
     * @param idx Index of the milestone.
     */
    function reclaimMissedMilestone(uint256 id, uint8 idx) external nonReentrant whenNotPaused {
        Agreement storage agreement = _agreements[id];
        require(msg.sender == agreement.client, "Only client can reclaim");
        require(agreement.status == AgreementStatus.Active, "Agreement not active");
        require(idx < _milestones[id].length, "Invalid milestone index");

        Milestone storage milestone = _milestones[id][idx];

        if (milestone.status == MilestoneStatus.Pending) {
            require(
                block.timestamp > uint256(milestone.deadline) + agreement.graceWindow,
                "Grace period not elapsed"
            );
        } else if (milestone.status == MilestoneStatus.Rejected) {
            require(
                block.timestamp > uint256(milestone.rejectionTime) + agreement.reviewWindow,
                "Dispute window not elapsed"
            );
        } else {
            revert("Milestone not eligible for reclaim");
        }

        uint256 amountToRefund = milestone.amount;
        _paymentSummaries[id].locked -= amountToRefund;
        _paymentSummaries[id].refunded += amountToRefund;

        milestone.status = MilestoneStatus.Refunded;

        emit MilestoneRefunded(id, idx, amountToRefund);

        (bool success, ) = payable(agreement.client).call{value: amountToRefund}("");
        require(success, "Client refund failed");

        _checkAgreementCompletion(id);
    }

    // =========================================================================
    // AMENDMENTS
    // =========================================================================

    /**
     * @notice Either party proposes an amendment to extend deadline or change terms.
     * @param id The ID of the agreement.
     * @param idx Milestone index to amend.
     * @param newDeadline Proposed new deadline timestamp (or 0 to keep current).
     * @param newTermsHash Proposed updated terms hash (or bytes32(0) to keep current).
     * @param newTermsURI Proposed updated terms URI.
     */
    function proposeAmendment(
        uint256 id,
        uint8 idx,
        uint64 newDeadline,
        bytes32 newTermsHash,
        string calldata newTermsURI
    ) external whenNotPaused {
        Agreement storage agreement = _agreements[id];
        require(
            msg.sender == agreement.client || msg.sender == agreement.freelancer,
            "Only parties can propose amendments"
        );
        require(agreement.status == AgreementStatus.Active, "Agreement not active");
        require(idx < _milestones[id].length, "Invalid milestone index");

        Milestone storage milestone = _milestones[id][idx];
        require(
            milestone.status != MilestoneStatus.Paid &&
                milestone.status != MilestoneStatus.Refunded,
            "Milestone already closed"
        );

        uint256 amendmentId = _amendments[id].length;

        _amendments[id].push(
            Amendment({
                amendmentId: amendmentId,
                milestoneIdx: idx,
                proposer: msg.sender,
                newDeadline: newDeadline,
                newTermsHash: newTermsHash,
                newTermsURI: newTermsURI,
                accepted: false,
                proposedAt: uint64(block.timestamp)
            })
        );

        emit AmendmentProposed(
            id,
            idx,
            amendmentId,
            msg.sender,
            newDeadline,
            newTermsHash,
            newTermsURI
        );
    }

    /**
     * @notice Counterparty accepts a proposed amendment, updating agreement/milestone state.
     * @param id The ID of the agreement.
     * @param amendmentId Index of the proposed amendment.
     */
    function acceptAmendment(uint256 id, uint256 amendmentId) external whenNotPaused {
        Agreement storage agreement = _agreements[id];
        require(agreement.status == AgreementStatus.Active, "Agreement not active");
        require(amendmentId < _amendments[id].length, "Invalid amendment ID");

        Amendment storage amendment = _amendments[id][amendmentId];
        require(!amendment.accepted, "Amendment already accepted");

        if (amendment.proposer == agreement.client) {
            require(msg.sender == agreement.freelancer, "Only freelancer can accept");
        } else {
            require(msg.sender == agreement.client, "Only client can accept");
        }

        amendment.accepted = true;

        if (amendment.newDeadline > 0) {
            _milestones[id][amendment.milestoneIdx].deadline = amendment.newDeadline;
        }
        if (amendment.newTermsHash != bytes32(0)) {
            agreement.termsHash = amendment.newTermsHash;
        }
        if (bytes(amendment.newTermsURI).length > 0) {
            agreement.termsURI = amendment.newTermsURI;
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
     * @param id The ID of the agreement.
     * @param idx Index of the milestone.
     * @param evidenceHash Hash of initial dispute statement/evidence.
     */
    function raiseDispute(
        uint256 id,
        uint8 idx,
        bytes32 evidenceHash
    ) external whenNotPaused {
        Agreement storage agreement = _agreements[id];
        require(
            msg.sender == agreement.client || msg.sender == agreement.freelancer,
            "Only parties can raise dispute"
        );
        require(agreement.status == AgreementStatus.Active, "Agreement not active");
        require(idx < _milestones[id].length, "Invalid milestone index");

        Milestone storage milestone = _milestones[id][idx];
        require(
            milestone.status == MilestoneStatus.Submitted ||
                milestone.status == MilestoneStatus.Rejected,
            "Milestone not in disputable status"
        );

        milestone.status = MilestoneStatus.Disputed;

        // Shift funds from locked into disputed
        _paymentSummaries[id].locked -= milestone.amount;
        _paymentSummaries[id].disputed += milestone.amount;

        emit DisputeRaised(id, idx, msg.sender, evidenceHash);

        if (evidenceHash != bytes32(0)) {
            _disputeEvidence[id][idx].push(evidenceHash);
            emit EvidenceSubmitted(id, idx, msg.sender, evidenceHash);
        }

        // Pseudo-random selection of 3 distinct arbitrators excluding client & freelancer
        address[3] memory selected = _selectArbitrators(
            id,
            idx,
            agreement.client,
            agreement.freelancer
        );

        Dispute storage dispute = _disputes[id][idx];
        dispute.disputeRaisedTime = uint64(block.timestamp);
        dispute.votingDeadline = uint64(block.timestamp + votingWindow);
        dispute.selectedArbitrators = selected;

        emit ArbitratorsSelected(id, idx, selected);
    }

    /**
     * @notice Parties submit supplementary evidence hashes to an active dispute.
     * @param id The ID of the agreement.
     * @param idx Index of the milestone.
     * @param evidenceHash Hash of additional evidence.
     */
    function submitEvidence(
        uint256 id,
        uint8 idx,
        bytes32 evidenceHash
    ) external whenNotPaused {
        Agreement storage agreement = _agreements[id];
        require(
            msg.sender == agreement.client || msg.sender == agreement.freelancer,
            "Only parties can submit evidence"
        );
        require(idx < _milestones[id].length, "Invalid milestone index");
        require(_milestones[id][idx].status == MilestoneStatus.Disputed, "Milestone not disputed");
        require(evidenceHash != bytes32(0), "Evidence hash cannot be empty");

        _disputeEvidence[id][idx].push(evidenceHash);
        emit EvidenceSubmitted(id, idx, msg.sender, evidenceHash);
    }

    /**
     * @notice Oracle records advisory AI dispute recommendation.
     * @dev Used as fallback resolution if fewer than 2 arbitrators vote by the voting deadline.
     * @param id The ID of the agreement.
     * @param idx Index of the milestone.
     * @param freelancerShareBps Recommended freelancer payout percentage (0-10000).
     * @param reportHash Hash of the dispute analysis report.
     */
    function recordAiRecommendation(
        uint256 id,
        uint8 idx,
        uint16 freelancerShareBps,
        bytes32 reportHash
    ) external whenNotPaused {
        require(msg.sender == oracle, "Only oracle can record recommendation");
        require(idx < _milestones[id].length, "Invalid milestone index");
        require(_milestones[id][idx].status == MilestoneStatus.Disputed, "Milestone not disputed");
        require(freelancerShareBps <= 10000, "Share bps > 10000");

        Dispute storage dispute = _disputes[id][idx];
        dispute.aiFreelancerShareBps = freelancerShareBps;
        dispute.aiReportHash = reportHash;
        dispute.hasAiRecommendation = true;

        emit AiRecommendationRecorded(id, idx, freelancerShareBps, reportHash);
    }

    /**
     * @notice Selected arbitrator casts their vote with a proposed freelancer payout percentage.
     * @param id The ID of the agreement.
     * @param idx Index of the milestone.
     * @param freelancerShareBps Arbitrator's proposed freelancer share in basis points (0-10000).
     */
    function castVote(
        uint256 id,
        uint8 idx,
        uint16 freelancerShareBps
    ) external whenNotPaused {
        require(idx < _milestones[id].length, "Invalid milestone index");
        require(_milestones[id][idx].status == MilestoneStatus.Disputed, "Milestone not disputed");
        require(freelancerShareBps <= 10000, "Share bps > 10000");

        Dispute storage dispute = _disputes[id][idx];
        require(block.timestamp <= dispute.votingDeadline, "Voting window has ended");

        bool isSelected = false;
        for (uint256 i = 0; i < 3; i++) {
            if (dispute.selectedArbitrators[i] == msg.sender) {
                isSelected = true;
                break;
            }
        }
        require(isSelected, "Caller not selected arbitrator");
        require(!_hasVoted[id][idx][msg.sender], "Arbitrator already voted");

        _hasVoted[id][idx][msg.sender] = true;
        _arbitratorVotes[id][idx][msg.sender] = freelancerShareBps;
        _disputeCastVotes[id][idx].push(freelancerShareBps);
        dispute.voteCount++;

        emit VoteCast(id, idx, msg.sender, freelancerShareBps);
    }

    /**
     * @notice Finalizes a dispute after voting deadline (or once all 3 arbitrators voted).
     * @dev Resolution priority:
     *      1. If >= 2 votes cast: MEDIAN of cast votes (method: "VOTE").
     *      2. If < 2 votes and AI recommendation recorded: AI recommendation (method: "AI_FALLBACK").
     *      3. Otherwise: Milestone aiProgressBps (method: "PROGRESS_FALLBACK").
     *      Pays freelancer share (minus platform fee), refunds balance to client.
     * @param id The ID of the agreement.
     * @param idx Index of the milestone.
     */
    function finalizeDispute(uint256 id, uint8 idx) external nonReentrant whenNotPaused {
        require(idx < _milestones[id].length, "Invalid milestone index");
        Milestone storage milestone = _milestones[id][idx];
        require(milestone.status == MilestoneStatus.Disputed, "Milestone not disputed");

        Dispute storage dispute = _disputes[id][idx];
        require(
            block.timestamp > dispute.votingDeadline || dispute.voteCount == 3,
            "Voting window not finished"
        );
        require(!dispute.resolved, "Dispute already resolved");

        uint16 freelancerShareBps;
        string memory method;

        if (dispute.voteCount >= 2) {
            method = "VOTE";
            uint16[] storage votes = _disputeCastVotes[id][idx];
            if (votes.length == 2) {
                freelancerShareBps = (votes[0] + votes[1]) / 2;
            } else {
                // Median of 3 votes
                uint16 a = votes[0];
                uint16 b = votes[1];
                uint16 c = votes[2];
                if (a > b) { (a, b) = (b, a); }
                if (b > c) { (b, c) = (c, b); }
                if (a > b) { (a, b) = (b, a); }
                freelancerShareBps = b;
            }
        } else if (dispute.hasAiRecommendation) {
            method = "AI_FALLBACK";
            freelancerShareBps = dispute.aiFreelancerShareBps;
        } else {
            method = "PROGRESS_FALLBACK";
            freelancerShareBps = milestone.aiProgressBps;
        }

        if (freelancerShareBps > 10000) {
            freelancerShareBps = 10000;
        }

        dispute.resolved = true;
        dispute.finalFreelancerShareBps = freelancerShareBps;
        dispute.resolutionMethod = method;

        uint256 totalAmount = milestone.amount;
        uint256 freelancerGross = (totalAmount * freelancerShareBps) / 10000;
        uint256 clientPayout = totalAmount - freelancerGross;
        uint256 fee = (freelancerGross * feeBps) / 10000;
        uint256 freelancerPayout = freelancerGross - fee;

        // Accounting update
        _paymentSummaries[id].disputed -= totalAmount;
        _paymentSummaries[id].released += freelancerPayout;
        _paymentSummaries[id].refunded += clientPayout;
        _paymentSummaries[id].feesPaid += fee;

        milestone.paidAmount = freelancerPayout;
        milestone.status = MilestoneStatus.Paid;

        emit DisputeResolved(id, idx, freelancerShareBps, method);

        Agreement storage agreement = _agreements[id];

        // Safe pull-over-push / CEI transfers
        if (freelancerPayout > 0) {
            (bool okF, ) = payable(agreement.freelancer).call{value: freelancerPayout}("");
            require(okF, "Freelancer payout failed");
        }
        if (clientPayout > 0) {
            (bool okC, ) = payable(agreement.client).call{value: clientPayout}("");
            require(okC, "Client refund failed");
        }
        if (fee > 0) {
            (bool okFee, ) = payable(treasury).call{value: fee}("");
            require(okFee, "Treasury fee payout failed");
        }

        _checkAgreementCompletion(id);
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================

    /**
     * @notice Adds an address to the arbitrator pool.
     * @param arbitrator Address of the new arbitrator.
     */
    function addArbitrator(address arbitrator) external onlyOwner {
        require(arbitrator != address(0), "Invalid address");
        require(!isArbitrator[arbitrator], "Already an arbitrator");

        isArbitrator[arbitrator] = true;
        arbitratorPool.push(arbitrator);
    }

    /**
     * @notice Removes an address from the arbitrator pool.
     * @param arbitrator Address of the arbitrator to remove.
     */
    function removeArbitrator(address arbitrator) external onlyOwner {
        require(isArbitrator[arbitrator], "Not an arbitrator");

        isArbitrator[arbitrator] = false;
        for (uint256 i = 0; i < arbitratorPool.length; i++) {
            if (arbitratorPool[i] == arbitrator) {
                arbitratorPool[i] = arbitratorPool[arbitratorPool.length - 1];
                arbitratorPool.pop();
                break;
            }
        }
    }

    /**
     * @notice Updates the backend oracle address.
     * @param _oracle New oracle address.
     */
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle address");
        oracle = _oracle;
    }

    /**
     * @notice Updates the protocol treasury address.
     * @param _treasury New payable treasury address.
     */
    function setTreasury(address payable _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
    }

    /**
     * @notice Sets protocol fee in basis points (max 500 = 5.00%).
     * @param _feeBps Fee basis points.
     */
    function setFeeBps(uint16 _feeBps) external onlyOwner {
        require(_feeBps <= 500, "Fee exceeds 500 bps");
        feeBps = _feeBps;
    }

    /**
     * @notice Updates the voting window duration for disputes.
     * @param _votingWindow Window in seconds.
     */
    function setVotingWindow(uint32 _votingWindow) external onlyOwner {
        require(_votingWindow >= 1 hours, "Window too short");
        votingWindow = _votingWindow;
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
        require(idx < _milestones[id].length, "Invalid milestone index");
        return _milestones[id][idx];
    }

    /**
     * @notice Retrieves total number of milestones for an agreement.
     * @param id Agreement ID.
     */
    function getMilestoneCount(uint256 id) external view returns (uint256) {
        return _milestones[id].length;
    }

    /**
     * @notice Retrieves dispute state and evidence for a milestone.
     * @param id Agreement ID.
     * @param idx Milestone index.
     */
    function getDispute(uint256 id, uint8 idx)
        external
        view
        returns (
            uint64 disputeRaisedTime,
            uint64 disputeVotingDeadline,
            address[3] memory selectedArbitrators,
            uint8 voteCount,
            uint16 aiFreelancerShareBps,
            bytes32 aiReportHash,
            bool hasAiRecommendation,
            bool resolved,
            uint16 finalFreelancerShareBps,
            string memory resolutionMethod,
            bytes32[] memory evidenceHashes
        )
    {
        Dispute storage d = _disputes[id][idx];
        return (
            d.disputeRaisedTime,
            d.votingDeadline,
            d.selectedArbitrators,
            d.voteCount,
            d.aiFreelancerShareBps,
            d.aiReportHash,
            d.hasAiRecommendation,
            d.resolved,
            d.finalFreelancerShareBps,
            d.resolutionMethod,
            _disputeEvidence[id][idx]
        );
    }

    /**
     * @notice Retrieves the current payment summary accounting for an agreement.
     * @dev Invariant: locked + released + disputed + refunded + feesPaid == totalFunded.
     * @param id Agreement ID.
     * @return locked Amount currently locked in pending/submitted milestones.
     * @return released Amount released to the freelancer.
     * @return disputed Amount frozen in active disputes.
     * @return refunded Amount refunded to the client (penalties, reclaims, dispute balances).
     * @return feesPaid Amount collected in platform fees.
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
        require(amendmentId < _amendments[id].length, "Invalid amendment ID");
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
    function _processPayout(
        uint256 id,
        uint8 idx,
        bool isAuto
    ) internal {
        Agreement storage agreement = _agreements[id];
        require(agreement.status == AgreementStatus.Active, "Agreement not active");
        require(idx < _milestones[id].length, "Invalid milestone index");

        Milestone storage milestone = _milestones[id][idx];
        require(milestone.status == MilestoneStatus.Submitted, "Milestone not submitted");

        // Lateness penalty calculation
        uint256 daysLate = 0;
        if (milestone.submissionTime > milestone.deadline) {
            daysLate = (milestone.submissionTime - milestone.deadline) / 1 days;
        }

        uint256 penaltyBps = daysLate * agreement.latePenaltyBpsPerDay;
        if (penaltyBps > agreement.maxLatePenaltyBps) {
            penaltyBps = agreement.maxLatePenaltyBps;
        }

        uint256 penaltyRefund = (milestone.amount * penaltyBps) / 10000;
        uint256 amountAfterPenalty = milestone.amount - penaltyRefund;
        uint256 fee = (amountAfterPenalty * feeBps) / 10000;
        uint256 freelancerAmount = amountAfterPenalty - fee;

        // Accounting update
        _paymentSummaries[id].locked -= milestone.amount;
        _paymentSummaries[id].released += freelancerAmount;
        _paymentSummaries[id].refunded += penaltyRefund;
        _paymentSummaries[id].feesPaid += fee;

        milestone.paidAmount = freelancerAmount;
        milestone.status = MilestoneStatus.Paid;

        emit MilestoneApproved(id, idx, isAuto);
        emit MilestonePaid(id, idx, freelancerAmount, fee, penaltyRefund);

        // Safe payouts
        if (freelancerAmount > 0) {
            (bool okF, ) = payable(agreement.freelancer).call{value: freelancerAmount}("");
            require(okF, "Freelancer payment failed");
        }
        if (penaltyRefund > 0) {
            (bool okC, ) = payable(agreement.client).call{value: penaltyRefund}("");
            require(okC, "Penalty refund failed");
        }
        if (fee > 0) {
            (bool okFee, ) = payable(treasury).call{value: fee}("");
            require(okFee, "Platform fee payment failed");
        }

        _checkAgreementCompletion(id);
    }

    /**
     * @dev Checks if all milestones are Paid or Refunded. If so, completes agreement.
     */
    function _checkAgreementCompletion(uint256 id) internal {
        Milestone[] storage mList = _milestones[id];
        bool allDone = true;
        for (uint256 i = 0; i < mList.length; i++) {
            if (
                mList[i].status != MilestoneStatus.Paid &&
                mList[i].status != MilestoneStatus.Refunded
            ) {
                allDone = false;
                break;
            }
        }

        if (allDone && _agreements[id].status != AgreementStatus.Completed) {
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
        uint256 eligibleCount = 0;

        for (uint256 i = 0; i < arbitratorPool.length; i++) {
            address arb = arbitratorPool[i];
            if (arb != client && arb != freelancer) {
                eligible[eligibleCount] = arb;
                eligibleCount++;
            }
        }

        require(eligibleCount >= 3, "Not enough eligible arbitrators in pool");

        uint256 seed = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    id,
                    idx,
                    eligibleCount
                )
            )
        );

        for (uint256 i = 0; i < 3; i++) {
            uint256 pick = i + (uint256(keccak256(abi.encodePacked(seed, i))) % (eligibleCount - i));
            selected[i] = eligible[pick];
            eligible[pick] = eligible[i];
        }

        return selected;
    }
}
