import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function main() {
  console.log('====================================================');
  console.log('        FAIRWORK ONE-TIME DEMO & ORACLE SETUP       ');
  console.log('====================================================');

  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

  // Load deployed contract address and ABI
  const deploymentPath = path.join(rootDir, 'shared', 'deployments', 'localhost.json');
  const abiPath = path.join(rootDir, 'shared', 'abi', 'FairWork.json');

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file missing at ${deploymentPath}. Please run deploy first.`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const abiJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  const contractAddress = deployment.FairWork || deployment.address;
  console.log(`Contract address: ${contractAddress}`);

  // Hardhat standard mnemonic accounts
  const accounts = [
    { index: 0, role: 'Deployer / Owner', key: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' },
    { index: 1, role: 'Client Demo', key: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' },
    { index: 2, role: 'Freelancer Demo', key: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' },
    { index: 3, role: 'Oracle Wallet', key: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' },
    { index: 4, role: 'Treasury Wallet', key: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a' },
    { index: 5, role: 'Arbitrator 1', key: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba' },
    { index: 6, role: 'Arbitrator 2', key: '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e' },
    { index: 7, role: 'Arbitrator 3', key: '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356' },
    { index: 8, role: 'Arbitrator 4', key: '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97' },
    { index: 9, role: 'Arbitrator 5', key: '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6' },
  ];

  const signers = accounts.map(a => new ethers.Wallet(a.key, provider));
  const ownerWallet = signers[0];
  const oracleWallet = signers[3];
  const treasuryWallet = signers[4];

  const contractAbi = Array.isArray(abiJson) ? abiJson : (abiJson.abi || abiJson);
  const fairWork = new ethers.Contract(contractAddress, contractAbi, ownerWallet);

  console.log('\n--- Configuring Contract System Parameters ---');

  // Track monotonic nonce
  let currentNonce = await provider.getTransactionCount(ownerWallet.address, 'pending');
  async function sendWithNonce(fnCall) {
    const tx = await fnCall(currentNonce++);
    await tx.wait();
    return tx;
  }

  // 1. Set Oracle
  const currentOracle = await fairWork.oracle();
  if (currentOracle.toLowerCase() !== oracleWallet.address.toLowerCase()) {
    console.log(`Setting Oracle -> ${oracleWallet.address}...`);
    await sendWithNonce(nonce => fairWork.setOracle(oracleWallet.address, { nonce }));
    console.log('✓ Oracle updated successfully');
  } else {
    console.log(`✓ Oracle already set to ${currentOracle}`);
  }

  // 2. Set Treasury
  const currentTreasury = await fairWork.treasury();
  if (currentTreasury.toLowerCase() !== treasuryWallet.address.toLowerCase()) {
    console.log(`Setting Treasury -> ${treasuryWallet.address}...`);
    await sendWithNonce(nonce => fairWork.setTreasury(treasuryWallet.address, { nonce }));
    console.log('✓ Treasury updated successfully');
  } else {
    console.log(`✓ Treasury already set to ${currentTreasury}`);
  }

  // 3. Set Fee Bps (100 = 1%)
  const currentFee = await fairWork.feeBps();
  if (Number(currentFee) !== 100) {
    console.log(`Setting Fee Bps -> 100 (1%)...`);
    await sendWithNonce(nonce => fairWork.setFeeBps(100, { nonce }));
    console.log('✓ Fee Bps set to 100');
  } else {
    console.log(`✓ Fee Bps already 100 (1%)`);
  }

  // 4. Add Arbitrators (Accounts 5..9)
  console.log('\n--- Registering Arbitrators ---');
  for (let i = 5; i <= 9; i++) {
    const arbAddr = signers[i].address;
    const isArb = await fairWork.isArbitrator(arbAddr);
    if (!isArb) {
      console.log(`Adding Arbitrator ${i - 4}: ${arbAddr}...`);
      await sendWithNonce(nonce => fairWork.addArbitrator(arbAddr, { nonce }));
      console.log(`✓ Added Arbitrator ${i - 4}`);
    } else {
      console.log(`✓ Arbitrator ${i - 4} already registered: ${arbAddr}`);
    }
  }

  let activeArbs = 0;
  for (let i = 5; i <= 9; i++) {
    if (await fairWork.isArbitrator(signers[i].address)) activeArbs++;
  }
  console.log(`Total Active Arbitrators Verified in Contract: ${activeArbs}`);

  // 5. Seed Demo Agreement #1 (Matching Frontend Dashboard & Walkthrough)
  console.log('\n--- Checking Demo Agreement #1 on Hardhat Node ---');
  let ag1Exists = false;
  try {
    const ag1 = await fairWork.getAgreement(1);
    if (ag1 && ag1.client !== ethers.ZeroAddress) {
      ag1Exists = true;
      console.log(`✓ Demo Agreement #1 already active on-chain (client: ${ag1.client})`);
    }
  } catch {}

  if (!ag1Exists) {
    console.log('Seeding Demo Agreement #1 on-chain with Milestone 2 submitted...');
    const clientWallet = signers[1];
    const freelancerWallet = signers[2];
    const latestBlock = await provider.getBlock('latest');
    const now = latestBlock ? latestBlock.timestamp : Math.floor(Date.now() / 1000);

    const termsHash = ethers.keccak256(
      ethers.toUtf8Bytes(
        JSON.stringify({
          schemaVersion: '1.0',
          title: 'FairWork Frontend & Escrow Integration',
          client: clientWallet.address.toLowerCase(),
          freelancer: freelancerWallet.address.toLowerCase(),
          currency: 'ETH',
          totalAmount: '2.5',
          paymentMode: 'MILESTONE'
        })
      )
    );
    const termsURI = 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
    const amounts = [
      ethers.parseEther('0.8'),
      ethers.parseEther('1.0'),
      ethers.parseEther('0.7')
    ];
    const deadlines = [
      now + 7 * 86400,
      now + 14 * 86400,
      now + 21 * 86400
    ];
    const requiredProgressBps = [8000, 8500, 9000];
    const criteriaHashes = [
      ethers.keccak256(ethers.toUtf8Bytes('Milestone 1: Web3 Wallet & Auth Architecture')),
      ethers.keccak256(ethers.toUtf8Bytes('Milestone 2: Agreement Dashboard & Milestone Flow')),
      ethers.keccak256(ethers.toUtf8Bytes('Milestone 3: Dispute Panel & Arbitrator Voting'))
    ];

    // 1. Client creates agreement
    const createTx = await fairWork.connect(clientWallet).createAgreement(
      freelancerWallet.address,
      termsHash,
      termsURI,
      0, // PaymentMode.MILESTONE
      100, // 1% per day
      3000, // 30% max
      5 * 86400, // 5 days review
      3 * 86400, // 3 days grace
      2, // max 2 revisions
      amounts,
      deadlines,
      requiredProgressBps,
      criteriaHashes
    );
    await createTx.wait();
    console.log('  1. Created Agreement #1 on-chain');

    // 2. Freelancer accepts agreement
    const acceptTx = await fairWork.connect(freelancerWallet).acceptAgreement(1);
    await acceptTx.wait();
    console.log('  2. Freelancer accepted Agreement #1');

    // 3. Client funds agreement with 2.5 ETH
    const fundTx = await fairWork.connect(clientWallet).fundAgreement(1, { value: ethers.parseEther('2.5') });
    await fundTx.wait();
    console.log('  3. Client funded Agreement #1 with 2.5 ETH (Status: Active)');

    // 4. Milestone 0: Freelancer submits, Oracle records progress, Client approves -> Paid
    const sub0Tx = await fairWork.connect(freelancerWallet).submitMilestone(1, 0, criteriaHashes[0], 'commit_m1_init');
    await sub0Tx.wait();
    const rec0Tx = await fairWork.connect(oracleWallet).recordProgress(1, 0, 8500, ethers.keccak256(ethers.toUtf8Bytes('ai_report_m1')));
    await rec0Tx.wait();
    const app0Tx = await fairWork.connect(clientWallet).approveMilestone(1, 0);
    await app0Tx.wait();
    console.log('  4. Milestone 1 (index 0) approved & paid out on-chain (0.8 ETH)');

    // 5. Milestone 1: Freelancer submits, Oracle records progress -> Submitted (Ready for Client to Approve!)
    const sub1Tx = await fairWork.connect(freelancerWallet).submitMilestone(1, 1, criteriaHashes[1], '4c7e0f3b');
    await sub1Tx.wait();
    const rec1Tx = await fairWork.connect(oracleWallet).recordProgress(1, 1, 8900, ethers.keccak256(ethers.toUtf8Bytes('ai_report_m2')));
    await rec1Tx.wait();
    console.log('  5. Milestone 2 (index 1) submitted on-chain -> Submitted (Ready for Client to Approve & Release Funds!)');
  }

  // Print Demo Table
  console.log('\n========================================================================================');
  console.log('                                 DEMO ACCOUNTS TABLE                                    ');
  console.log('========================================================================================');
  console.log('| Idx | Role             | Address                                    | Private Key (MetaMask)                         |');
  console.log('|-----|------------------|--------------------------------------------|------------------------------------------------|');
  for (const a of accounts) {
    const wallet = new ethers.Wallet(a.key);
    console.log(`| ${String(a.index).padEnd(3)} | ${a.role.padEnd(16)} | ${wallet.address} | ${a.key} |`);
  }
  console.log('========================================================================================\n');
  console.log('✓ Setup complete! All parameters ready for E2E and Live Demo.');
}

main().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
