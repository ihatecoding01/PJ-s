const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("FairWork Smart Contract", function () {
  let fairWork;
  let owner, client, freelancer, oracle, treasury, arb1, arb2, arb3, arb4, nonParty;
  let termsHash, termsURI;

  const ONE_ETHER = ethers.parseEther("1.0");
  const HALF_ETHER = ethers.parseEther("0.5");
  const TWO_ETHER = ethers.parseEther("2.0");

  beforeEach(async function () {
    [
      owner,
      client,
      freelancer,
      oracle,
      treasury,
      arb1,
      arb2,
      arb3,
      arb4,
      nonParty,
    ] = await ethers.getSigners();

    const FairWorkFactory = await ethers.getContractFactory("FairWork");
    fairWork = await FairWorkFactory.deploy();
    await fairWork.waitForDeployment();

    // Setup roles
    await fairWork.setOracle(oracle.address);
    await fairWork.setTreasury(treasury.address);
    await fairWork.setFeeBps(100); // 1.00%

    // Setup arbitrator pool
    await fairWork.addArbitrator(arb1.address);
    await fairWork.addArbitrator(arb2.address);
    await fairWork.addArbitrator(arb3.address);
    await fairWork.addArbitrator(arb4.address);

    termsHash = ethers.keccak256(ethers.toUtf8Bytes("canonical-terms-json-hash"));
    termsURI = "ipfs://QmTermsURI123";
  });

  describe("1. Happy Path (Milestone Mode)", function () {
    it("should successfully execute full lifecycle with multiple milestones", async function () {
      const now = await time.latest();
      const deadlines = [now + 1000, now + 2000];
      const amounts = [ONE_ETHER, ONE_ETHER];
      const requiredProgressBps = [5000, 10000];
      const criteriaHashes = [
        ethers.keccak256(ethers.toUtf8Bytes("Milestone 1")),
        ethers.keccak256(ethers.toUtf8Bytes("Milestone 2")),
      ];

      // 1. Create Agreement
      const createTx = await fairWork
        .connect(client)
        .createAgreement(
          freelancer.address,
          termsHash,
          termsURI,
          0, // MILESTONE
          100, // 1% per day late penalty
          3000, // 30% max late penalty
          86400, // 1 day review window
          86400, // 1 day grace window
          2, // max 2 revisions
          amounts,
          deadlines,
          requiredProgressBps,
          criteriaHashes
        );

      await expect(createTx)
        .to.emit(fairWork, "AgreementCreated")
        .withArgs(1, client.address, freelancer.address, termsHash, termsURI);

      let agreement = await fairWork.getAgreement(1);
      expect(agreement.status).to.equal(0); // Draft
      expect(agreement.totalAmount).to.equal(TWO_ETHER);

      // 2. Freelancer accepts
      await expect(fairWork.connect(freelancer).acceptAgreement(1))
        .to.emit(fairWork, "AgreementAccepted")
        .withArgs(1);

      agreement = await fairWork.getAgreement(1);
      expect(agreement.status).to.equal(1); // AwaitingFunding

      // 3. Client funds
      await expect(
        fairWork.connect(client).fundAgreement(1, { value: TWO_ETHER })
      )
        .to.emit(fairWork, "AgreementFunded")
        .withArgs(1, TWO_ETHER);

      agreement = await fairWork.getAgreement(1);
      expect(agreement.status).to.equal(2); // Active

      let summary = await fairWork.getPaymentSummary(1);
      expect(summary.locked).to.equal(TWO_ETHER);

      // 4. Milestone 0: Submit, Oracle Record, Approve
      const subHash0 = ethers.keccak256(ethers.toUtf8Bytes("sub0"));
      await expect(
        fairWork.connect(freelancer).submitMilestone(1, 0, subHash0, "commit-sha-0")
      )
        .to.emit(fairWork, "MilestoneSubmitted")
        .withArgs(1, 0, subHash0, "commit-sha-0");

      const aiReportHash0 = ethers.keccak256(ethers.toUtf8Bytes("aiReport0"));
      await expect(
        fairWork.connect(oracle).recordProgress(1, 0, 8500, aiReportHash0)
      )
        .to.emit(fairWork, "ProgressRecorded")
        .withArgs(1, 0, 8500, aiReportHash0);

      const fBalanceBefore = await ethers.provider.getBalance(freelancer.address);
      const tBalanceBefore = await ethers.provider.getBalance(treasury.address);

      const approveTx0 = await fairWork.connect(client).approveMilestone(1, 0);
      await expect(approveTx0).to.emit(fairWork, "MilestoneApproved").withArgs(1, 0, false);

      // Fee is 1% of 1 ETH = 0.01 ETH, Freelancer gets 0.99 ETH
      const fee0 = ethers.parseEther("0.01");
      const freelancerAmt0 = ethers.parseEther("0.99");

      await expect(approveTx0)
        .to.emit(fairWork, "MilestonePaid")
        .withArgs(1, 0, freelancerAmt0, fee0, 0);

      const fBalanceAfter = await ethers.provider.getBalance(freelancer.address);
      const tBalanceAfter = await ethers.provider.getBalance(treasury.address);

      expect(fBalanceAfter - fBalanceBefore).to.equal(freelancerAmt0);
      expect(tBalanceAfter - tBalanceBefore).to.equal(fee0);

      // 5. Milestone 1: Submit and Approve
      const subHash1 = ethers.keccak256(ethers.toUtf8Bytes("sub1"));
      await fairWork.connect(freelancer).submitMilestone(1, 1, subHash1, "commit-sha-1");

      const approveTx1 = await fairWork.connect(client).approveMilestone(1, 1);
      await expect(approveTx1).to.emit(fairWork, "AgreementCompleted").withArgs(1);

      agreement = await fairWork.getAgreement(1);
      expect(agreement.status).to.equal(3); // Completed

      // Accounting check
      summary = await fairWork.getPaymentSummary(1);
      expect(summary.locked).to.equal(0);
      expect(summary.released).to.equal(ethers.parseEther("1.98"));
      expect(summary.feesPaid).to.equal(ethers.parseEther("0.02"));
      expect(summary.refunded).to.equal(0);
      expect(summary.disputed).to.equal(0);
      expect(
        summary.locked + summary.released + summary.disputed + summary.refunded + summary.feesPaid
      ).to.equal(TWO_ETHER);
    });
  });

  describe("2. Lump-Sum Mode with Late Penalty", function () {
    it("should calculate and refund correct late penalty to client", async function () {
      const now = await time.latest();
      const deadline = now + 1000;
      const amounts = [ONE_ETHER];
      const deadlines = [deadline];
      const requiredProgressBps = [10000];
      const criteriaHashes = [ethers.keccak256(ethers.toUtf8Bytes("Complete project"))];

      // Create LUMP_SUM agreement
      await fairWork
        .connect(client)
        .createAgreement(
          freelancer.address,
          termsHash,
          termsURI,
          1, // LUMP_SUM
          100, // 100 bps = 1% per day
          3000, // max 3000 bps = 30%
          86400,
          86400,
          2,
          amounts,
          deadlines,
          requiredProgressBps,
          criteriaHashes
        );

      await fairWork.connect(freelancer).acceptAgreement(1);
      await fairWork.connect(client).fundAgreement(1, { value: ONE_ETHER });

      // Fast forward time to 5 days past deadline (5 * 86400 seconds)
      await time.increaseTo(deadline + 5 * 86400);

      // Freelancer submits 5 days late
      await fairWork
        .connect(freelancer)
        .submitMilestone(1, 0, ethers.keccak256(ethers.toUtf8Bytes("late")), "sha");

      const clientBalBefore = await ethers.provider.getBalance(client.address);
      const freelancerBalBefore = await ethers.provider.getBalance(freelancer.address);
      const treasuryBalBefore = await ethers.provider.getBalance(treasury.address);

      // Client approves
      const tx = await fairWork.connect(client).approveMilestone(1, 0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      // Penalty = 5 days * 100 bps = 500 bps = 5% of 1 ETH = 0.05 ETH
      // Amount after penalty = 0.95 ETH
      // Platform fee = 1% of 0.95 ETH = 0.0095 ETH
      // Freelancer payout = 0.95 - 0.0095 = 0.9405 ETH
      const penaltyRefund = ethers.parseEther("0.05");
      const fee = ethers.parseEther("0.0095");
      const freelancerPayout = ethers.parseEther("0.9405");

      await expect(tx)
        .to.emit(fairWork, "MilestonePaid")
        .withArgs(1, 0, freelancerPayout, fee, penaltyRefund);

      const clientBalAfter = await ethers.provider.getBalance(client.address);
      const freelancerBalAfter = await ethers.provider.getBalance(freelancer.address);
      const treasuryBalAfter = await ethers.provider.getBalance(treasury.address);

      expect(clientBalAfter + gasCost - clientBalBefore).to.equal(penaltyRefund);
      expect(freelancerBalAfter - freelancerBalBefore).to.equal(freelancerPayout);
      expect(treasuryBalAfter - treasuryBalBefore).to.equal(fee);

      const summary = await fairWork.getPaymentSummary(1);
      expect(summary.refunded).to.equal(penaltyRefund);
      expect(summary.released).to.equal(freelancerPayout);
      expect(summary.feesPaid).to.equal(fee);
      expect(summary.locked + summary.released + summary.refunded + summary.feesPaid).to.equal(
        ONE_ETHER
      );
    });
  });

  describe("3. Auto-Approve After Review Window", function () {
    it("should allow freelancer to auto-claim when client remains silent", async function () {
      const now = await time.latest();
      const reviewWindow = 3 * 86400; // 3 days

      await fairWork.connect(client).createAgreement(
        freelancer.address,
        termsHash,
        termsURI,
        0,
        100,
        2000,
        reviewWindow,
        86400,
        2,
        [ONE_ETHER],
        [now + 1000],
        [10000],
        [ethers.keccak256(ethers.toUtf8Bytes("M1"))]
      );

      await fairWork.connect(freelancer).acceptAgreement(1);
      await fairWork.connect(client).fundAgreement(1, { value: ONE_ETHER });

      await fairWork.connect(freelancer).submitMilestone(1, 0, ethers.keccak256(ethers.toUtf8Bytes("sub")), "sha");

      // Attempt claim before review window expires
      await expect(
        fairWork.connect(freelancer).claimAfterReviewWindow(1, 0)
      ).to.be.revertedWith("Review window has not elapsed");

      // Advance time past review window
      await time.increase(reviewWindow + 10);

      // Freelancer claims payout
      const claimTx = await fairWork.connect(freelancer).claimAfterReviewWindow(1, 0);

      await expect(claimTx)
        .to.emit(fairWork, "MilestoneApproved")
        .withArgs(1, 0, true); // isAuto = true

      const milestone = await fairWork.getMilestone(1, 0);
      expect(milestone.status).to.equal(5); // Paid
    });
  });

  describe("4. Reclaim After Missed Deadline", function () {
    it("should allow client to reclaim funds if freelancer misses deadline + graceWindow", async function () {
      const now = await time.latest();
      const deadline = now + 1000;
      const graceWindow = 2 * 86400; // 2 days

      await fairWork.connect(client).createAgreement(
        freelancer.address,
        termsHash,
        termsURI,
        0,
        100,
        2000,
        86400,
        graceWindow,
        2,
        [ONE_ETHER],
        [deadline],
        [10000],
        [ethers.keccak256(ethers.toUtf8Bytes("M1"))]
      );

      await fairWork.connect(freelancer).acceptAgreement(1);
      await fairWork.connect(client).fundAgreement(1, { value: ONE_ETHER });

      // Before deadline + graceWindow
      await expect(
        fairWork.connect(client).reclaimMissedMilestone(1, 0)
      ).to.be.revertedWith("Grace period not elapsed");

      // Advance time past deadline + graceWindow
      await time.increaseTo(deadline + graceWindow + 10);

      const clientBalBefore = await ethers.provider.getBalance(client.address);
      const tx = await fairWork.connect(client).reclaimMissedMilestone(1, 0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      await expect(tx)
        .to.emit(fairWork, "MilestoneRefunded")
        .withArgs(1, 0, ONE_ETHER);

      const clientBalAfter = await ethers.provider.getBalance(client.address);
      expect(clientBalAfter + gasCost - clientBalBefore).to.equal(ONE_ETHER);

      const milestone = await fairWork.getMilestone(1, 0);
      expect(milestone.status).to.equal(6); // Refunded

      const agreement = await fairWork.getAgreement(1);
      expect(agreement.status).to.equal(3); // Completed
    });
  });

  describe("5. Rejection then Resubmission", function () {
    it("should track revisions and allow resubmission up to maxRevisions", async function () {
      const now = await time.latest();

      await fairWork.connect(client).createAgreement(
        freelancer.address,
        termsHash,
        termsURI,
        0,
        100,
        2000,
        86400,
        86400,
        1, // maxRevisions = 1
        [ONE_ETHER],
        [now + 10000],
        [10000],
        [ethers.keccak256(ethers.toUtf8Bytes("M1"))]
      );

      await fairWork.connect(freelancer).acceptAgreement(1);
      await fairWork.connect(client).fundAgreement(1, { value: ONE_ETHER });

      // 1st submission
      await fairWork.connect(freelancer).submitMilestone(1, 0, ethers.keccak256(ethers.toUtf8Bytes("sub1")), "sha1");

      // Client rejects
      const reasonHash = ethers.keccak256(ethers.toUtf8Bytes("Incomplete feature"));
      await expect(fairWork.connect(client).rejectMilestone(1, 0, reasonHash))
        .to.emit(fairWork, "MilestoneRejected")
        .withArgs(1, 0, reasonHash);

      let milestone = await fairWork.getMilestone(1, 0);
      expect(milestone.status).to.equal(3); // Rejected
      expect(milestone.revisionsCount).to.equal(1);

      // Freelancer resubmits (revision 1 <= maxRevisions 1)
      await fairWork.connect(freelancer).submitMilestone(1, 0, ethers.keccak256(ethers.toUtf8Bytes("sub2")), "sha2");
      milestone = await fairWork.getMilestone(1, 0);
      expect(milestone.status).to.equal(1); // Submitted

      // Client approves resubmission
      await fairWork.connect(client).approveMilestone(1, 0);
      milestone = await fairWork.getMilestone(1, 0);
      expect(milestone.status).to.equal(5); // Paid
    });
  });

  describe("6. Dispute Resolution by Arbitrator Vote", function () {
    it("should select 3 arbitrators and resolve using median of votes", async function () {
      const now = await time.latest();

      await fairWork.connect(client).createAgreement(
        freelancer.address,
        termsHash,
        termsURI,
        0,
        100,
        2000,
        86400,
        86400,
        2,
        [ONE_ETHER],
        [now + 10000],
        [10000],
        [ethers.keccak256(ethers.toUtf8Bytes("M1"))]
      );

      await fairWork.connect(freelancer).acceptAgreement(1);
      await fairWork.connect(client).fundAgreement(1, { value: ONE_ETHER });
      await fairWork.connect(freelancer).submitMilestone(1, 0, ethers.keccak256(ethers.toUtf8Bytes("sub")), "sha");

      // Raise dispute
      const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("Evidence statement"));
      const disputeTx = await fairWork.connect(client).raiseDispute(1, 0, evidenceHash);

      await expect(disputeTx)
        .to.emit(fairWork, "DisputeRaised")
        .withArgs(1, 0, client.address, evidenceHash);

      const disputeData = await fairWork.getDispute(1, 0);
      const selectedArbs = disputeData[2];
      expect(selectedArbs.length).to.equal(3);

      // Arbitrators cast votes: 7000 bps (70%), 8000 bps (80%), 9000 bps (90%)
      const arbSigner0 = await ethers.getSigner(selectedArbs[0]);
      const arbSigner1 = await ethers.getSigner(selectedArbs[1]);
      const arbSigner2 = await ethers.getSigner(selectedArbs[2]);

      await fairWork.connect(arbSigner0).castVote(1, 0, 7000);
      await fairWork.connect(arbSigner1).castVote(1, 0, 8000);
      await fairWork.connect(arbSigner2).castVote(1, 0, 9000);

      // Finalize dispute (all 3 voted)
      const finalizeTx = await fairWork.connect(nonParty).finalizeDispute(1, 0);

      // Median of [7000, 8000, 9000] is 8000 bps (80%)
      await expect(finalizeTx)
        .to.emit(fairWork, "DisputeResolved")
        .withArgs(1, 0, 8000, "VOTE");

      // Freelancer share = 80% of 1 ETH = 0.8 ETH
      // Fee = 1% of 0.8 ETH = 0.008 ETH
      // Freelancer payout = 0.792 ETH
      // Client refund = 0.2 ETH
      const summary = await fairWork.getPaymentSummary(1);
      expect(summary.released).to.equal(ethers.parseEther("0.792"));
      expect(summary.refunded).to.equal(ethers.parseEther("0.2"));
      expect(summary.feesPaid).to.equal(ethers.parseEther("0.008"));
      expect(summary.disputed).to.equal(0);
      expect(summary.locked).to.equal(0);
    });
  });

  describe("7. Dispute Fallback Mechanisms", function () {
    it("should fall back to AI recommendation if < 2 votes cast", async function () {
      const now = await time.latest();

      await fairWork.connect(client).createAgreement(
        freelancer.address,
        termsHash,
        termsURI,
        0,
        100,
        2000,
        86400,
        86400,
        2,
        [ONE_ETHER],
        [now + 10000],
        [10000],
        [ethers.keccak256(ethers.toUtf8Bytes("M1"))]
      );

      await fairWork.connect(freelancer).acceptAgreement(1);
      await fairWork.connect(client).fundAgreement(1, { value: ONE_ETHER });
      await fairWork.connect(freelancer).submitMilestone(1, 0, ethers.keccak256(ethers.toUtf8Bytes("sub")), "sha");

      await fairWork.connect(freelancer).raiseDispute(1, 0, ethers.keccak256(ethers.toUtf8Bytes("ev")));

      // Oracle records AI recommendation: 6000 bps (60%)
      const aiReportHash = ethers.keccak256(ethers.toUtf8Bytes("disputeReport"));
      await fairWork.connect(oracle).recordAiRecommendation(1, 0, 6000, aiReportHash);

      // Only 1 arbitrator votes
      const disputeData = await fairWork.getDispute(1, 0);
      const arbSigner0 = await ethers.getSigner(disputeData[2][0]);
      await fairWork.connect(arbSigner0).castVote(1, 0, 9000);

      // Advance time past voting window (3 days)
      await time.increase(3 * 86400 + 100);

      const finalizeTx = await fairWork.connect(client).finalizeDispute(1, 0);
      await expect(finalizeTx)
        .to.emit(fairWork, "DisputeResolved")
        .withArgs(1, 0, 6000, "AI_FALLBACK");
    });

    it("should fall back to aiProgressBps if < 2 votes cast and no AI recommendation recorded", async function () {
      const now = await time.latest();

      await fairWork.connect(client).createAgreement(
        freelancer.address,
        termsHash,
        termsURI,
        0,
        100,
        2000,
        86400,
        86400,
        2,
        [ONE_ETHER],
        [now + 10000],
        [10000],
        [ethers.keccak256(ethers.toUtf8Bytes("M1"))]
      );

      await fairWork.connect(freelancer).acceptAgreement(1);
      await fairWork.connect(client).fundAgreement(1, { value: ONE_ETHER });
      await fairWork.connect(freelancer).submitMilestone(1, 0, ethers.keccak256(ethers.toUtf8Bytes("sub")), "sha");

      // Oracle recorded 4500 bps progress before dispute
      await fairWork.connect(oracle).recordProgress(1, 0, 4500, ethers.keccak256(ethers.toUtf8Bytes("rep")));

      await fairWork.connect(client).raiseDispute(1, 0, ethers.keccak256(ethers.toUtf8Bytes("ev")));

      // No votes cast, no AI dispute recommendation recorded
      await time.increase(3 * 86400 + 100);

      const finalizeTx = await fairWork.connect(client).finalizeDispute(1, 0);
      await expect(finalizeTx)
        .to.emit(fairWork, "DisputeResolved")
        .withArgs(1, 0, 4500, "PROGRESS_FALLBACK");
    });
  });

  describe("8. Access Control & Validation", function () {
    it("should revert unauthorized calls and enforce validation", async function () {
      const now = await time.latest();

      // Client cannot be freelancer
      await expect(
        fairWork.connect(client).createAgreement(
          client.address,
          termsHash,
          termsURI,
          0,
          100,
          2000,
          86400,
          86400,
          2,
          [ONE_ETHER],
          [now + 1000],
          [10000],
          [ethers.keccak256(ethers.toUtf8Bytes("M1"))]
        )
      ).to.be.revertedWith("Client cannot be freelancer");

      // Create valid agreement
      await fairWork.connect(client).createAgreement(
        freelancer.address,
        termsHash,
        termsURI,
        0,
        100,
        2000,
        86400,
        86400,
        2,
        [ONE_ETHER],
        [now + 1000],
        [10000],
        [ethers.keccak256(ethers.toUtf8Bytes("M1"))]
      );

      // Only freelancer can accept
      await expect(
        fairWork.connect(nonParty).acceptAgreement(1)
      ).to.be.revertedWith("Only freelancer can accept");

      await fairWork.connect(freelancer).acceptAgreement(1);

      // Only client can fund
      await expect(
        fairWork.connect(nonParty).fundAgreement(1, { value: ONE_ETHER })
      ).to.be.revertedWith("Only client can fund");

      // Must fund exact amount
      await expect(
        fairWork.connect(client).fundAgreement(1, { value: HALF_ETHER })
      ).to.be.revertedWith("Must fund exact total amount");

      await fairWork.connect(client).fundAgreement(1, { value: ONE_ETHER });

      // Non-oracle cannot record progress
      await fairWork.connect(freelancer).submitMilestone(1, 0, ethers.keccak256(ethers.toUtf8Bytes("sub")), "sha");
      await expect(
        fairWork.connect(nonParty).recordProgress(1, 0, 8000, ethers.keccak256(ethers.toUtf8Bytes("rep")))
      ).to.be.revertedWith("Only oracle can record progress");

      // Non-owner cannot set fee or add arbitrator
      await expect(
        fairWork.connect(nonParty).setFeeBps(200)
      ).to.be.revertedWithCustomError(fairWork, "OwnableUnauthorizedAccount");

      // Fee cannot exceed 500 bps
      await expect(
        fairWork.connect(owner).setFeeBps(600)
      ).to.be.revertedWith("Fee exceeds 500 bps");

      // Pausable enforcement
      await fairWork.connect(owner).pause();
      await expect(
        fairWork.connect(client).approveMilestone(1, 0)
      ).to.be.revertedWithCustomError(fairWork, "EnforcedPause");

      await fairWork.connect(owner).unpause();
    });
  });

  describe("9. Reentrancy Protection", function () {
    it("should prevent reentrant calls on payouts", async function () {
      const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
      const attacker = await AttackerFactory.deploy(await fairWork.getAddress());
      await attacker.waitForDeployment();
      const attackerAddress = await attacker.getAddress();

      const now = await time.latest();
      const deadline = now + 1000;
      const graceWindow = 86400;

      // Fund the attacker contract and get its impersonated signer
      await owner.sendTransaction({
        to: attackerAddress,
        value: ethers.parseEther("5.0"),
      });
      const attackerSigner = await ethers.getImpersonatedSigner(attackerAddress);

      // Attacker contract creates agreement as client
      await fairWork.connect(attackerSigner).createAgreement(
        freelancer.address,
        termsHash,
        termsURI,
        0,
        100,
        2000,
        86400,
        graceWindow,
        2,
        [ONE_ETHER],
        [deadline],
        [10000],
        [ethers.keccak256(ethers.toUtf8Bytes("M1"))]
      );

      await fairWork.connect(freelancer).acceptAgreement(1);
      await fairWork.connect(attackerSigner).fundAgreement(1, { value: ONE_ETHER });

      // Fast forward past deadline + graceWindow
      await time.increaseTo(deadline + graceWindow + 100);

      // Set target on attacker contract
      await attacker.setTarget(1, 0);

      // Trigger reclaim via attacker contract:
      // When FairWork refunds ETH, attacker's receive() hook attempts re-entrant call
      await attacker.executeReclaim();

      // Verify that the reentrant call was blocked by nonReentrant
      expect(await attacker.attackAttempted()).to.be.true;
      expect(await attacker.attackFailed()).to.be.true;

      const milestone = await fairWork.getMilestone(1, 0);
      expect(milestone.status).to.equal(6); // Refunded
    });
  });

  describe("10. Accounting Invariant", function () {
    it("should strictly maintain locked + released + disputed + refunded + feesPaid == totalFunded", async function () {
      const now = await time.latest();
      const amounts = [HALF_ETHER, HALF_ETHER, ONE_ETHER];
      const deadlines = [now + 1000, now + 2000, now + 3000];

      await fairWork.connect(client).createAgreement(
        freelancer.address,
        termsHash,
        termsURI,
        0,
        100,
        2000,
        86400,
        86400,
        2,
        amounts,
        deadlines,
        [5000, 8000, 10000],
        [
          ethers.keccak256(ethers.toUtf8Bytes("M1")),
          ethers.keccak256(ethers.toUtf8Bytes("M2")),
          ethers.keccak256(ethers.toUtf8Bytes("M3")),
        ]
      );

      await fairWork.connect(freelancer).acceptAgreement(1);
      await fairWork.connect(client).fundAgreement(1, { value: TWO_ETHER });

      // Invariant Helper
      const checkInvariant = async () => {
        const s = await fairWork.getPaymentSummary(1);
        const sum = s.locked + s.released + s.disputed + s.refunded + s.feesPaid;
        expect(sum).to.equal(TWO_ETHER);
      };

      await checkInvariant();

      // Milestone 0: Submit & Approve
      await fairWork.connect(freelancer).submitMilestone(1, 0, ethers.keccak256(ethers.toUtf8Bytes("sub0")), "sha");
      await fairWork.connect(client).approveMilestone(1, 0);
      await checkInvariant();

      // Milestone 1: Submit & Dispute
      await fairWork.connect(freelancer).submitMilestone(1, 1, ethers.keccak256(ethers.toUtf8Bytes("sub1")), "sha");
      await fairWork.connect(client).raiseDispute(1, 1, ethers.keccak256(ethers.toUtf8Bytes("ev")));
      await checkInvariant();

      const disputeData = await fairWork.getDispute(1, 1);
      const arbSigner0 = await ethers.getSigner(disputeData[2][0]);
      const arbSigner1 = await ethers.getSigner(disputeData[2][1]);
      const arbSigner2 = await ethers.getSigner(disputeData[2][2]);
      await fairWork.connect(arbSigner0).castVote(1, 1, 5000);
      await fairWork.connect(arbSigner1).castVote(1, 1, 5000);
      await fairWork.connect(arbSigner2).castVote(1, 1, 5000);

      await fairWork.connect(client).finalizeDispute(1, 1);
      await checkInvariant();

      // Milestone 2: Missed & Reclaimed
      await time.increaseTo(deadlines[2] + 86400 + 100);
      await fairWork.connect(client).reclaimMissedMilestone(1, 2);
      await checkInvariant();

      const agreement = await fairWork.getAgreement(1);
      expect(agreement.status).to.equal(3); // Completed
    });
  });

  describe("11. Amendments Workflow", function () {
    it("should allow either party to propose and counterparty to accept an amendment", async function () {
      const now = await time.latest();

      await fairWork.connect(client).createAgreement(
        freelancer.address,
        termsHash,
        termsURI,
        0,
        100,
        2000,
        86400,
        86400,
        2,
        [ONE_ETHER],
        [now + 1000],
        [10000],
        [ethers.keccak256(ethers.toUtf8Bytes("M1"))]
      );

      await fairWork.connect(freelancer).acceptAgreement(1);
      await fairWork.connect(client).fundAgreement(1, { value: ONE_ETHER });

      const newDeadline = now + 5000;
      const newTermsHash = ethers.keccak256(ethers.toUtf8Bytes("updated-terms"));
      const newTermsURI = "ipfs://QmUpdatedTerms";

      // Freelancer proposes amendment
      await expect(
        fairWork
          .connect(freelancer)
          .proposeAmendment(1, 0, newDeadline, newTermsHash, newTermsURI)
      )
        .to.emit(fairWork, "AmendmentProposed")
        .withArgs(1, 0, 0, freelancer.address, newDeadline, newTermsHash, newTermsURI);

      expect(await fairWork.getAmendmentCount(1)).to.equal(1);

      // Freelancer cannot accept own proposal
      await expect(
        fairWork.connect(freelancer).acceptAmendment(1, 0)
      ).to.be.revertedWith("Only client can accept");

      // Client accepts amendment
      await expect(fairWork.connect(client).acceptAmendment(1, 0))
        .to.emit(fairWork, "AmendmentAccepted")
        .withArgs(1, 0);

      const milestone = await fairWork.getMilestone(1, 0);
      expect(milestone.deadline).to.equal(newDeadline);

      const agreement = await fairWork.getAgreement(1);
      expect(agreement.termsHash).to.equal(newTermsHash);
      expect(agreement.termsURI).to.equal(newTermsURI);
    });
  });
});
