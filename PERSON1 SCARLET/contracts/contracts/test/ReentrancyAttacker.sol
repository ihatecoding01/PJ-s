// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IFairWork {
    function createAgreement(
        address freelancer,
        bytes32 termsHash,
        string calldata termsURI,
        uint8 mode,
        uint16 latePenaltyBpsPerDay,
        uint16 maxLatePenaltyBps,
        uint32 reviewWindow,
        uint32 graceWindow,
        uint8 maxRevisions,
        uint256[] calldata amounts,
        uint64[] calldata deadlines,
        uint16[] calldata requiredProgressBps,
        bytes32[] calldata criteriaHashes
    ) external returns (uint256);

    function fundAgreement(uint256 id) external payable;
    function reclaimMissedMilestone(uint256 id, uint8 idx) external;
}

contract ReentrancyAttacker {
    IFairWork public fairWork;
    uint256 public targetAgreementId;
    uint8 public targetMilestoneIdx;
    bool public attackAttempted;
    bool public attackFailed;

    constructor(address _fairWork) {
        fairWork = IFairWork(_fairWork);
    }

    function setTarget(uint256 id, uint8 idx) external {
        targetAgreementId = id;
        targetMilestoneIdx = idx;
        attackAttempted = false;
        attackFailed = false;
    }

    function executeReclaim() external {
        fairWork.reclaimMissedMilestone(targetAgreementId, targetMilestoneIdx);
    }

    receive() external payable {
        if (!attackAttempted) {
            attackAttempted = true;
            // Attempt to re-enter reclaimMissedMilestone
            try fairWork.reclaimMissedMilestone(targetAgreementId, targetMilestoneIdx) {
                // If this succeeds, reentrancy guard failed
            } catch {
                attackFailed = true;
            }
        }
    }
}
