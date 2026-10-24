const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const signers = await hre.ethers.getSigners();
  const [admin, client, freelancer, oracle, arb1, arb2, arb3] = signers;

  console.log("==================================================");
  console.log("FairWork Demo Seeding Script");
  console.log("==================================================");
  console.log(`Admin/Deployer: ${admin.address}`);
  console.log(`Client:         ${client.address}`);
  console.log(`Freelancer:     ${freelancer.address}`);
  console.log(`Oracle:         ${oracle.address}`);
  console.log(`Arbitrator 1:   ${arb1.address}`);
  console.log(`Arbitrator 2:   ${arb2.address}`);
  console.log(`Arbitrator 3:   ${arb3.address}`);
  console.log("--------------------------------------------------");

  // Check if contract is already deployed on localhost, or deploy a fresh one
  const sharedDir = fs.existsSync(path.resolve(__dirname, "../../../shared"))
    ? path.resolve(__dirname, "../../../shared")
    : path.resolve(__dirname, "../../shared");
  const deploymentsDir = path.join(sharedDir, "deployments");
  const localDeployFile = path.join(deploymentsDir, "localhost.json");
  let contractAddress;

  if (fs.existsSync(localDeployFile)) {
    const deploymentData = JSON.parse(fs.readFileSync(localDeployFile, "utf8"));
    const code = await hre.ethers.provider.getCode(deploymentData.address);
    if (code !== "0x" && code !== "") {
      contractAddress = deploymentData.address;
      console.log(`Using existing deployed FairWork contract at: ${contractAddress}`);
    }
  }

  if (!contractAddress) {
    console.log("Deploying fresh FairWork instance on local node...");
    const FairWorkFactory = await hre.ethers.getContractFactory("FairWork");
    const fairWorkDeploy = await FairWorkFactory.connect(admin).deploy();
    await fairWorkDeploy.waitForDeployment();
    contractAddress = await fairWorkDeploy.getAddress();
    console.log(`Deployed fresh FairWork contract at: ${contractAddress}`);

    // Export deployment and ABI
    const abiDir = path.join(sharedDir, "abi");
    if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });
    if (!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });

    const artifactPath = path.resolve(__dirname, "../artifacts/contracts/FairWork.sol/FairWork.json");
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      fs.writeFileSync(path.join(abiDir, "FairWork.json"), JSON.stringify(artifact.abi, null, 2));
    }

    fs.writeFileSync(
      localDeployFile,
      JSON.stringify(
        {
          contract: "FairWork",
          address: contractAddress,
          network: "localhost",
          chainId: 31337,
          deployer: admin.address,
          deployedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  }

  const fairWork = await hre.ethers.getContractAt("FairWork", contractAddress);

  // 1. Configure Oracle, Treasury and Arbitrator Pool as Admin
  console.log("1. Configuring contract settings...");
  const currentOracle = await fairWork.oracle();
  if (currentOracle.toLowerCase() !== oracle.address.toLowerCase()) {
    const txOracle = await fairWork.connect(admin).setOracle(oracle.address);
    await txOracle.wait();
    console.log(`   Oracle set to: ${oracle.address}`);
  }

  // Add arbitrators if not already present
  for (const arb of [arb1, arb2, arb3]) {
    const isArb = await fairWork.isArbitrator(arb.address);
    if (!isArb) {
      const txArb = await fairWork.connect(admin).addArbitrator(arb.address);
      await txArb.wait();
      console.log(`   Added arbitrator to pool: ${arb.address}`);
    }
  }

  // 2. Prepare Agreement Terms & Milestones
  console.log("2. Creating demo agreement with 3 milestones...");
  const latestBlock = await hre.ethers.provider.getBlock("latest");
  const now = latestBlock.timestamp;

  const termsHash = hre.ethers.keccak256(
    hre.ethers.toUtf8Bytes(
      JSON.stringify({
        schemaVersion: "1.0",
        title: "Full-Stack Web3 DApp Development",
        description: "Develop milestone-based escrow platform for FairWork",
        client: client.address.toLowerCase(),
        freelancer: freelancer.address.toLowerCase(),
        currency: "ETH",
        totalAmount: "1.5",
        paymentMode: "MILESTONE",
      })
    )
  );

  const termsURI = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
  const mode = 0; // PaymentMode.MILESTONE
  const latePenaltyBpsPerDay = 100; // 1.00% per day
  const maxLatePenaltyBps = 3000;   // 30.00% cap
  const reviewWindow = 5 * 86400;   // 5 days
  const graceWindow = 3 * 86400;    // 3 days
  const maxRevisions = 2;

  const amounts = [
    hre.ethers.parseEther("0.5"),
    hre.ethers.parseEther("0.5"),
    hre.ethers.parseEther("0.5"),
  ];

  const deadlines = [
    now + 7 * 86400,   // Milestone 0: 7 days
    now + 14 * 86400,  // Milestone 1: 14 days
    now + 21 * 86400,  // Milestone 2: 21 days
  ];

  const requiredProgressBps = [8000, 8000, 10000]; // 80%, 80%, 100%

  const criteriaHashes = [
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("Milestone 0: UI Mockups & Architecture Design")),
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("Milestone 1: Backend API & Smart Contract Integration")),
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("Milestone 2: Production Deployment & QA Testing")),
  ];

  // Client creates agreement
  const createTx = await fairWork
    .connect(client)
    .createAgreement(
      freelancer.address,
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
    );
  const receipt = await createTx.wait();

  // Find agreement ID from event
  let agreementId = 1;
  for (const log of receipt.logs) {
    try {
      const parsed = fairWork.interface.parseLog(log);
      if (parsed && parsed.name === "AgreementCreated") {
        agreementId = parsed.args.id;
        break;
      }
    } catch (e) {}
  }
  console.log(`   Agreement Created! ID: ${agreementId}`);

  // 3. Freelancer accepts agreement
  console.log("3. Freelancer accepting agreement...");
  const acceptTx = await fairWork.connect(freelancer).acceptAgreement(agreementId);
  await acceptTx.wait();
  console.log("   Agreement accepted by freelancer (Status: AwaitingFunding)");

  // 4. Client funds agreement
  console.log("4. Client funding agreement with 1.5 ETH...");
  const totalFunding = hre.ethers.parseEther("1.5");
  const fundTx = await fairWork.connect(client).fundAgreement(agreementId, { value: totalFunding });
  await fundTx.wait();
  console.log("   Agreement funded! (Status: Active)");

  // 5. Check payment summary
  const summary = await fairWork.getPaymentSummary(agreementId);
  console.log("--------------------------------------------------");
  console.log("Agreement On-Chain Status:");
  console.log(`- Agreement ID: ${agreementId}`);
  console.log(`- Total Locked: ${hre.ethers.formatEther(summary.locked)} ETH`);
  console.log(`- Total Released: ${hre.ethers.formatEther(summary.released)} ETH`);
  console.log(`- Total Disputed: ${hre.ethers.formatEther(summary.disputed)} ETH`);
  console.log(`- Total Refunded: ${hre.ethers.formatEther(summary.refunded)} ETH`);
  console.log(`- Total Fees: ${hre.ethers.formatEther(summary.feesPaid)} ETH`);
  console.log("==================================================");
  console.log("Seed completed successfully! Demo data is ready for Backend & Frontend.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
